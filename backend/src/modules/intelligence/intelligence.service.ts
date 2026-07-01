import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

const FCIE_JURISDICTIONS = [
  'UAE', 'Turkey', 'Indonesia', 'Pakistan', 'Egypt',
  'United States', 'Bangladesh', 'Philippines', 'Malaysia',
];

const JURISDICTION_QUERIES: Record<string, string[]> = {
  UAE:            ['UAE AML CFT CBUAE regulations', 'UAE Central Bank financial crime enforcement', 'UAE DFSA sanctions financial crime'],
  Turkey:         ['Turkey MASAK AML regulations', 'Turkey money laundering enforcement', 'Turkey financial crime BDDK'],
  Indonesia:      ['Indonesia PPATK AML OJK', 'Indonesia money laundering enforcement', 'Indonesia financial crime regulation'],
  Pakistan:       ['Pakistan FMU AML SBP', 'Pakistan money laundering enforcement', 'Pakistan financial crime regulation'],
  Egypt:          ['Egypt Central Bank AML CFT', 'Egypt financial crime enforcement', 'Egypt money laundering regulation'],
  'United States':['FinCEN enforcement action AML', 'OFAC sanctions designation', 'BSA AML regulation FinCEN advisory'],
  Bangladesh:     ['Bangladesh BFIU AML regulation', 'Bangladesh financial crime enforcement', 'Bangladesh money laundering'],
  Philippines:    ['Philippines AMLC enforcement', 'Philippines BSP AML financial crime', 'Philippines money laundering regulation'],
  Malaysia:       ['Malaysia BNM AML AMLATFPUAA', 'Malaysia financial crime enforcement', 'Malaysia money laundering regulation'],
};

const CATEGORY_PATTERNS: { cat: string; kws: string[] }[] = [
  { cat: 'sanctions',       kws: ['sanction', 'ofac', 'designation', 'blacklist', 'sdn', 'asset freeze', 'restricted list'] },
  { cat: 'enforcement',     kws: ['fine', 'penalty', 'enforcement', 'prosecution', 'revoc', 'suspen', 'consent order', 'censure', 'charged', 'arrested', 'convicted'] },
  { cat: 'fatf',            kws: ['fatf', 'grey list', 'blacklist', 'mutual evaluation', 'financial action task force'] },
  { cat: 'fiu',             kws: ['fiu', 'financial intelligence unit', 'fincen advisory', 'egmont', 'ppatk', 'bfiu', 'amlc', 'fmu'] },
  { cat: 'central-bank',    kws: ['central bank', 'cbuae', 'state bank of pakistan', 'bank negara', 'bangko sentral', 'bangladesh bank', 'reserve bank'] },
  { cat: 'financial-crime', kws: ['money laundering', 'terrorist financing', 'fraud', 'cybercrime', 'trafficking', 'corruption', 'bribery', 'tax evasion', 'crypto crime', 'trade-based', 'proliferation'] },
  { cat: 'regulatory',      kws: ['regulat', 'guidance', 'circular', 'directive', 'consultation', 'notice', 'amendment', 'law', 'act', 'rule', 'framework'] },
];

const SEVERITY_PATTERNS: { sev: string; kws: string[] }[] = [
  { sev: 'critical', kws: ['major', 'critical', 'significant', 'record fine', 'criminal prosecution', 'blacklist', 'billion', 'arrest', 'convicted', 'collapse', 'massive'] },
  { sev: 'high',     kws: ['fine', 'penalty', 'enforcement', 'million', 'violation', 'breach', 'failure', 'suspension', 'revoc', 'grey list', 'charged'] },
  { sev: 'medium',   kws: ['guidance', 'circular', 'consultation', 'update', 'amendment', 'notice', 'warning', 'risk', 'proposed'] },
];

const AUTHORITY_MAP: Record<string, string[]> = {
  UAE:            ['CBUAE', 'UAE Central Bank', 'DFSA', 'FSRA', 'SCA', 'VARA'],
  'United States':['FinCEN', 'OFAC', 'OCC', 'FDIC', 'Federal Reserve', 'SEC', 'CFPB', 'DOJ', 'FinCEN'],
  Turkey:         ['MASAK', 'BDDK', 'CMB'],
  Indonesia:      ['OJK', 'PPATK', 'Bank Indonesia'],
  Pakistan:       ['SBP', 'FMU', 'SECP'],
  Egypt:          ['CBE', 'Egyptian Central Bank', 'EFSA', 'FRA'],
  Bangladesh:     ['Bangladesh Bank', 'BFIU', 'BSEC'],
  Philippines:    ['BSP', 'AMLC', 'SEC Philippines', 'Bangko Sentral'],
  Malaysia:       ['BNM', 'Bank Negara Malaysia', 'SC', 'Labuan FSA'],
};

const TAG_KEYWORDS = ['aml', 'cft', 'sanctions', 'kyc', 'cdd', 'edd', 'sar', 'ctr', 'fatf', 'travel rule', 'virtual asset', 'crypto', 'pep', 'beneficial ownership', 'fintech', 'cbdc', 'stablecoin'];

export interface FcieItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  country: string;
  category: string;
  severity: string;
  summary: string;
  authority: string;
  confidenceScore: number;
  tags: string[];
  ingested: string;
}

@Injectable()
export class IntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(IntelligenceService.name);
  private items: FcieItem[] = [];
  private lastRefresh: string | null = null;
  private refreshing = false;

  onModuleInit() {
    this.runIngest().catch(e => this.logger.warn(`Initial FCIE ingest failed: ${e.message}`));
    setInterval(() => {
      this.runIngest().catch(e => this.logger.warn(`Scheduled FCIE ingest failed: ${e.message}`));
    }, 60 * 60 * 1000); // hourly
  }

  getFeed(country?: string, category?: string, severity?: string, limit = 100): FcieItem[] {
    let result = [...this.items];
    if (country) result = result.filter(i => i.country === country);
    if (category) result = result.filter(i => i.category === category);
    if (severity) result = result.filter(i => i.severity === severity);
    return result.slice(0, limit);
  }

  getStats() {
    const byCountry: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const item of this.items) {
      byCountry[item.country] = (byCountry[item.country] || 0) + 1;
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
    }
    return { total: this.items.length, lastRefresh: this.lastRefresh, byCountry, byCategory, bySeverity };
  }

  async triggerRefresh(): Promise<{ queued: boolean }> {
    if (this.refreshing) return { queued: false };
    this.runIngest().catch(e => this.logger.warn(`Manual FCIE ingest failed: ${e.message}`));
    return { queued: true };
  }

  private async runIngest(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    const fresh: FcieItem[] = [];

    for (const country of FCIE_JURISDICTIONS) {
      for (const query of (JURISDICTION_QUERIES[country] || [])) {
        try {
          const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 9000);
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MalTPROBot/1.0; +https://mal.ai)' },
          });
          clearTimeout(timeout);
          if (!res.ok) continue;
          const xml = await res.text();
          fresh.push(...this.parseRSS(xml, country));
        } catch {
          // Continue — don't let one failed query block others
        }
        // Polite delay between requests
        await new Promise(r => setTimeout(r, 400));
      }
    }

    // Deduplicate by URL (fallback: by title)
    const seen = new Set<string>();
    const deduped: FcieItem[] = [];
    for (const item of fresh) {
      const key = item.url || item.title;
      if (!seen.has(key)) { seen.add(key); deduped.push(item); }
    }

    deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    this.items = deduped.slice(0, 250);
    this.lastRefresh = new Date().toISOString();
    this.refreshing = false;
    this.logger.log(`FCIE ingest complete: ${this.items.length} items across ${FCIE_JURISDICTIONS.length} jurisdictions`);
  }

  private parseRSS(xml: string, country: string): FcieItem[] {
    const items: FcieItem[] = [];
    const itemRx = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRx.exec(xml)) !== null) {
      const raw = m[1];
      const rawTitle = this.extractTag(raw, 'title');
      // Google News appends " — Source Name" — strip it for the clean title
      const titleParts = rawTitle.split(' - ');
      const title = titleParts.length > 1 ? titleParts.slice(0, -1).join(' - ').trim() : rawTitle.trim();
      const sourceName = titleParts.length > 1 ? titleParts[titleParts.length - 1].trim() : this.extractTag(raw, 'source') || 'Google News';
      const link = this.extractTag(raw, 'link') || this.extractTag(raw, 'guid');
      const pubDate = this.extractTag(raw, 'pubDate');
      const description = this.extractTag(raw, 'description').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);

      if (!title || title.length < 8) continue;
      const fullText = (title + ' ' + description).toLowerCase();
      items.push({
        id: 'fcie_' + Buffer.from((link || title).slice(0, 60)).toString('base64url').slice(0, 20),
        title,
        url: link,
        source: sourceName,
        publishedAt: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '',
        country,
        category: this.classifyCategory(fullText),
        severity:  this.classifySeverity(fullText),
        summary:   description.slice(0, 300),
        authority: this.extractAuthority(title, country),
        confidenceScore: 75,
        tags:      TAG_KEYWORDS.filter(kw => fullText.includes(kw)).slice(0, 5),
        ingested:  new Date().toISOString(),
      });
    }
    return items;
  }

  private extractTag(xml: string, tag: string): string {
    const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i').exec(xml);
    if (cdata) return cdata[1].trim();
    const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
    return plain ? plain[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim() : '';
  }

  private classifyCategory(text: string): string {
    for (const { cat, kws } of CATEGORY_PATTERNS) {
      if (kws.some(kw => text.includes(kw))) return cat;
    }
    return 'regulatory';
  }

  private classifySeverity(text: string): string {
    for (const { sev, kws } of SEVERITY_PATTERNS) {
      if (kws.some(kw => text.includes(kw))) return sev;
    }
    return 'low';
  }

  private extractAuthority(title: string, country: string): string {
    for (const auth of (AUTHORITY_MAP[country] || [])) {
      if (title.includes(auth)) return auth;
    }
    return '';
  }
}

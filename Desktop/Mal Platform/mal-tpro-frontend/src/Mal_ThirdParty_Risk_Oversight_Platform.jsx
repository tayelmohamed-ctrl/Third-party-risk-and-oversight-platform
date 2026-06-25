import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  LayoutDashboard, Users, ShieldAlert, Clock, BookOpen, GraduationCap, FileText,
  Radio, Trophy, Database, Megaphone, BarChart3, FolderOpen, Search, Download,
  UploadCloud, Flame, Star, Check, X, AlertTriangle, Globe, ChevronRight, Plus,
  TrendingUp, TrendingDown, Minus, MessageSquare, Paperclip, Bell, Lock, ShieldCheck,
  Send, ClipboardCheck, Building2, Activity, CircleAlert, UserPlus, FileSignature,
  Play, Pause, ChevronLeft, Film
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, RadialBarChart, RadialBar,
  PolarAngleAxis, BarChart, Bar, XAxis, YAxis, LineChart, Line
} from "recharts";
import * as XLSX from "xlsx";

/* ============================================================================
   SEED DATA
============================================================================ */
const SEED_VERSION = 6;

const JUR_NEWS = {
  Pakistan: [
    { type: "TYPOLOGY", sev: "crit", text: "Hawala/hundi settlement detected when payouts lack a matching bank-settlement leg." },
    { type: "SANCTIONS", sev: "crit", text: "NACTA Fourth-Schedule additions published — re-screen beneficiary base." },
    { type: "FRAUD", sev: "high", text: "Pig-butchering proceeds routed through remittance mules into PK accounts." },
    { type: "REG", sev: "med", text: "FBR continues payout-record reconstruction (Payoneer precedent)." },
  ],
  Bangladesh: [
    { type: "TYPOLOGY", sev: "high", text: "Trade-based ML via RMG over/under-invoicing — third-party payers off-invoice." },
    { type: "FRAUD", sev: "med", text: "bKash/Nagad agent smurfing under KYC tiers; rapid wallet hops." },
  ],
  UAE: [
    { type: "SANCTIONS", sev: "crit", text: "Iran shadow-banking nexus — UAE shells receiving large inflows; screen BOs." },
    { type: "REG", sev: "med", text: "UAE Local Terrorist List update — freeze-without-delay; goAML report." },
  ],
  Egypt: [
    { type: "TYPOLOGY", sev: "med", text: "Parallel-FX / informal hawala pressure on inbound remittance." },
    { type: "REG", sev: "med", text: "CBE circular tightening MSB reporting expectations." },
  ],
  Philippines: [
    { type: "FRAUD", sev: "high", text: "Scam-syndicate & online-gaming (POGO) proceeds layering through e-wallets." },
    { type: "TYPOLOGY", sev: "med", text: "OFW remittance many-to-one funnels, rapid cash-out." },
  ],
};

const SEV = { crit: { c: "#ef4444", t: "Critical" }, high: { c: "#f59e0b", t: "High" }, med: { c: "#1e63e9", t: "Medium" }, low: { c: "#17a34a", t: "Low" } };
const TYPE_COLOR = { FRAUD: "#ef4444", TYPOLOGY: "#8000ff", SANCTIONS: "#8b5cf6", REG: "#1e63e9" };

// component scores are 0-100, higher = better
const AGENTS_BASE = [
  { id: "swiftx", name: "SwiftX DLT Pay", category: "Payout partners", relationship: "Pakistan corridor payout — last-mile disbursement", jur: "Pakistan", juris: ["Pakistan"], license: "FINTRAC MSB · Swiss VQF · SBP authorised-dealer chain", tier: "Critical", live: true,
    contacts: [{ role: "Compliance Officer", name: "Faizan R.", email: "compliance@swiftx.example" }, { role: "Ops lead", name: "S. Ali", email: "ops@swiftx.example" }],
    scores: { reporting: 78, responsiveness: 72, training: 90, audit: 70, findings: 60, timeliness: 65, quality: 80, cooperation: 85, risk: 55 }, history: [70, 68, 72, 74, 73] },
  { id: "thunes", name: "Thunes", category: "Payout partners", relationship: "Multi-corridor payout (Bangladesh, Philippines)", jur: "Bangladesh", juris: ["Bangladesh", "Philippines"], license: "Multi-corridor PSP; per-corridor authorisation", tier: "High", live: false,
    contacts: [{ role: "Compliance", name: "M. Rahman", email: "compliance@thunes.example" }],
    scores: { reporting: 84, responsiveness: 80, training: 75, audit: 82, findings: 80, timeliness: 78, quality: 85, cooperation: 80, risk: 70 }, history: [76, 78, 80, 81, 82] },
  { id: "gulf", name: "Gulf Remit FZ", category: "Payout partners", relationship: "UAE corridor payout", jur: "United Arab Emirates", juris: ["United Arab Emirates"], license: "CBUAE-registered; ADGM contracting", tier: "High", live: false,
    contacts: [{ role: "MLRO", name: "H. Saeed", email: "mlro@gulfremit.example" }],
    scores: { reporting: 66, responsiveness: 60, training: 55, audit: 64, findings: 50, timeliness: 58, quality: 62, cooperation: 65, risk: 45 }, history: [64, 62, 60, 58, 57] },
  { id: "nile", name: "Nile Payments", category: "Payout partners", relationship: "Egypt corridor payout", jur: "Egypt", juris: ["Egypt"], license: "CBE MSB licence", tier: "Medium", live: false,
    contacts: [{ role: "Compliance", name: "A. Mostafa", email: "compliance@nile.example" }],
    scores: { reporting: 72, responsiveness: 74, training: 80, audit: 70, findings: 75, timeliness: 76, quality: 73, cooperation: 78, risk: 68 }, history: [70, 71, 72, 74, 75] },
  { id: "pearl", name: "Pearl Payout", category: "Payout partners", relationship: "Philippines corridor payout", jur: "Philippines", juris: ["Philippines"], license: "BSP-registered EMI/RA", tier: "Medium", live: false,
    contacts: [{ role: "Compliance", name: "J. Cruz", email: "compliance@pearl.example" }],
    scores: { reporting: 88, responsiveness: 86, training: 92, audit: 85, findings: 88, timeliness: 84, quality: 88, cooperation: 90, risk: 80 }, history: [82, 84, 86, 87, 89] },
  { id: "aktifpay", name: "AktifPay", category: "Payout partners", relationship: "Turkey corridor payout — last-mile disbursement", jur: "Turkey", juris: ["Turkey"], license: "BDDK-licensed payment institution", tier: "High", live: false,
    contacts: [{ role: "Compliance", name: "K. Yilmaz", email: "compliance@aktifpay.example" }],
    scores: { reporting: 72, responsiveness: 70, training: 68, audit: 70, findings: 65, timeliness: 71, quality: 72, cooperation: 74, risk: 58 }, history: [68, 69, 70, 71, 72] },
  { id: "doku", name: "Doku Wallet", category: "Payout partners", relationship: "Indonesia corridor payout — last-mile disbursement", jur: "Indonesia", juris: ["Indonesia"], license: "OJK-licensed payment service provider", tier: "High", live: false,
    contacts: [{ role: "Compliance", name: "R. Santoso", email: "compliance@doku.example" }],
    scores: { reporting: 74, responsiveness: 72, training: 70, audit: 68, findings: 68, timeliness: 72, quality: 73, cooperation: 72, risk: 60 }, history: [69, 70, 71, 72, 73] },
  { id: "zenus", name: "Zenus Bank International, Inc.", category: "Banking partner", relationship: "USD banking rails — FBO master account, sub-accounts, ACH, settlement, Visa BIN", jur: "United States", juris: ["United States", "Puerto Rico"], license: "Puerto Rico IFE — OCIF-regulated (not FDIC-insured)", tier: "Critical", live: true,
    contacts: [{ role: "Head of Risk (signatory)", name: "Jorge M. Soltero", email: "risk@zenus.example" }, { role: "BSA/AML", name: "Zenus Compliance", email: "compliance@zenus.example" }],
    kdp: [{ name: "Jorge M. Soltero", role: "Head of Risk — Zenus signatory" }],
    agreement: { entity: "Zenus Bank International, Inc.", counterparty: "Mal Money, Inc. (Program Manager)", signedFor: "Mal: Abdallah Abu Sheikh (Sole Director)", effective: "29 May 2026", term: "36-month initial, then 1-year renewals", notice: "90 days non-renewal; settlement-failure cure 5 business days", commercial: "Minimum FBO balance $50,000; fund to greater of min or 5-day trailing average", governingLaw: "Puerto Rico", status: "Executed (DocuSign)", doc: "Program Services Agreement (FBO)" },
    scores: { reporting: 88, responsiveness: 86, training: 82, audit: 74, findings: 76, timeliness: 84, quality: 84, cooperation: 86, risk: 80 }, history: [86, 86, 85, 84, 82] },
  { id: "rain", name: "Signify Holdings, Inc. (Rain)", category: "Card & settlement", relationship: "Card issuing sponsorship, program management & settlement (Visa); stablecoin settlement", jur: "United States", juris: ["United States"], license: "Card issuing program (Signify/Rain) — issuing depository unnamed in MSA", tier: "Critical", live: true,
    contacts: [{ role: "Signify contact", name: "Kay Galarza", email: "kay@rain.xyz" }, { role: "Mal program owner", name: "Loay Osama", email: "loay.malahmeh@mal.ai" }],
    kdp: [{ name: "Signify Holdings, Inc.", role: "Card issuing entity (brand: Rain)" }, { name: "Kay Galarza", role: "Signify commercial contact" }],
    agreement: { entity: "Signify Holdings, Inc. (brand: Rain)", counterparty: "Mal Money Inc. (Partner)", signedFor: "Mal: pending signature", effective: "On last signature (proposal issued 18 May 2026)", term: "5-year initial, auto-renew 1-year", notice: "90 days non-renewal", commercial: "Partner bears 100% program losses; reserve 4x largest daily settlement; USDC/USDG free, USDT 10bps", governingLaw: "Per Signify Terms of Service (controls MSA; unilaterally amendable)", status: "MLRO review — Do Not Sign in current form", doc: "Card Issuing & Program Management Agreement (MSA)" },
    scores: { reporting: 70, responsiveness: 72, training: 70, audit: 68, findings: 42, timeliness: 72, quality: 66, cooperation: 70, risk: 52 }, history: [80, 78, 74, 68, 60] },
  { id: "saascada", name: "SaaScada", category: "Technology & processors", relationship: "Core ledger / system of record", jur: "Global", juris: ["Global"], license: "Ledger integrity & reconciliation controls", tier: "Critical", live: true,
    contacts: [{ role: "Vendor compliance", name: "SaaScada", email: "compliance@saascada.example" }],
    scores: { reporting: 80, responsiveness: 82, training: 78, audit: 86, findings: 88, timeliness: 84, quality: 86, cooperation: 84, risk: 82 }, history: [80, 81, 82, 83, 84] },
  { id: "oscilar", name: "Oscilar", category: "Technology & processors", relationship: "AML transaction monitoring & screening engine (processor — never CDD reliance)", jur: "Global", juris: ["Global"], license: "AML TM rule library (card/ACH/wire/SWIFT) — OFAC & crypto modules absent OOTB", tier: "Critical", live: true,
    contacts: [{ role: "Vendor compliance", name: "Oscilar", email: "compliance@oscilar.example" }],
    kdp: [{ name: "Oscilar (entity)", role: "TM / screening processor" }],
    agreement: { entity: "Oscilar", counterparty: "Mal Global Accounts", signedFor: "", effective: "Under review (June 2026)", term: "Pre-contract — rule-library gap analysis", notice: "—", commercial: "—", governingLaw: "—", status: "Gap analysis — competent floor, missing roof", doc: "Standard Rule Library Overview + Mal Gap Analysis" },
    scores: { reporting: 80, responsiveness: 84, training: 78, audit: 72, findings: 50, timeliness: 86, quality: 74, cooperation: 84, risk: 58 }, history: [84, 84, 83, 82, 80] },
  { id: "shufti", name: "ShuftiPro", category: "Technology & processors", relationship: "Identity verification (processor — never CDD reliance)", jur: "Global", juris: ["Global"], license: "IDV; model & rule documentation", tier: "High", live: true,
    contacts: [{ role: "Vendor compliance", name: "ShuftiPro", email: "compliance@shufti.example" }],
    scores: { reporting: 76, responsiveness: 78, training: 82, audit: 80, findings: 84, timeliness: 82, quality: 80, cooperation: 80, risk: 80 }, history: [76, 77, 79, 80, 81] },
];

const CATEGORIES = [
  { id: "Payout partners", color: "#8000ff", note: "Disburse funds to beneficiaries" },
  { id: "Banking partner", color: "#1e63e9", note: "Holds funds & provides USD rails" },
  { id: "Card & settlement", color: "#0ea5e9", note: "Card issuing & settlement" },
  { id: "Technology & processors", color: "#7c3aed", note: "Screening, ledger, IDV — never CDD reliance" },
];

const EMBLEM_PATH = "M948.44,590.83l-45.78-56.62,42.7-54.27c1.24-4.69,2.75-10.24,2.25-15.07-.62-6.07-11.92-31.06-14.99-39.13-6.66-17.55-17.34-50.81-26.04-65.49-2.04-3.45-4.24-6.33-7.76-8.4l-92.43-14.39,13.64-92.54c-.93-3.97-3.03-6.93-5.72-9.9-11.44-12.67-40.05-32.72-54.84-44.28-6.8-5.32-27.32-23.51-32.94-25.91-4.47-1.91-10.22-2.11-15.06-2.31l-68,26.05-38.42-57.38c-4.08-2.63-8.89-5.78-13.64-6.8-5.97-1.28-33.23,1.74-41.85,2.16-18.74.91-53.68.79-70.34,4.53-3.91.88-7.34,2.08-10.38,4.79l-42.25,83.46-83.8-41.57c-4.06-.35-7.52.74-11.18,2.38-15.58,6.97-43.5,27.98-59.06,38.47-7.16,4.83-30.8,18.72-34.82,23.32-3.19,3.66-5.16,9.07-6.86,13.61l3.76,72.72-66.44,18.81c-3.76,3.07-8.24,6.67-10.68,10.87-3.07,5.28-8.61,32.14-10.88,40.47-4.93,18.11-15.84,51.3-17.43,68.29-.37,3.99-.29,7.62,1.34,11.35l66.32,65.97-65.43,66.85c-1.59,3.76-1.62,7.39-1.19,11.37,1.81,16.97,13.17,50.02,18.34,68.05,2.38,8.3,8.28,35.08,11.42,40.32,2.5,4.17,7.03,7.71,10.83,10.73l70.32,18.89-2.64,69c1.76,4.52,3.79,9.9,7.04,13.52,4.07,4.55,27.9,18.12,35.13,22.85,15.7,10.28,43.89,30.92,59.57,37.68,3.68,1.59,7.16,2.63,11.21,2.23l83.24-42.69,43.36,82.89c3.08,2.67,6.52,3.82,10.45,4.65,16.7,3.52,51.64,2.93,70.39,3.59,8.63.3,35.92,2.96,41.87,1.6,4.74-1.08,9.51-4.3,13.55-6.98l39.7-61.04,64.81,23.84c4.84-.27,10.59-.55,15.03-2.52,5.58-2.47,25.86-20.94,32.59-26.35,14.63-11.75,42.97-32.19,54.24-45.01,2.65-3.01,4.71-5.99,5.59-9.98l-14.88-92.35,92.23-15.63c3.49-2.11,5.65-5.02,7.65-8.5,8.51-14.8,18.75-48.2,25.17-65.84,2.95-8.11,13.92-33.25,14.46-39.33.43-4.84-1.15-10.37-2.45-15.04ZM862.03,661.79c-1.75,6.33-19.21,53.12-21.92,54.2-3.64.48-5.87-3.76-8.04-6.05-18.01-18.99-35.46-48.93-53.87-65.73-4.85-4.43-7.2-6.48-14.23-6.16-13.01.61-51.28,6.74-63.55,10.46-.46.14-.89.29-1.31.45-1.82.3-3.26,1.19-4.2,2.75-1.17,1.39-1.56,3.05-1.25,4.86-.02.44-.02.9,0,1.38.43,12.81,6.93,51.02,10.54,63.53,1.95,6.76,4.65,8.32,10.41,11.49,21.83,12.02,55.78,18.91,79.56,29.86,2.87,1.32,7.6,2.07,8.31,5.67-.15,2.92-38.84,34.5-44.27,38.2-12.55,8.54-14.48,6.3-28.08,2.16-20.5-6.24-41.07-14.29-61.66-22.68l-23.84-48.68c-9.66-9.07-12.38-2.16-17.93,5.7-4.72,6.69-9.31,13.58-13.81,20.59-8.97-3.41-17.94-6.62-26.89-9.53-9.16-2.97-15.47-6.88-17.78,6.17l11.03,58.53c-11.31,18.76-22.82,37.25-35.33,54.27-8.42,11.45-8.62,14.41-23.78,15.08-6.57.29-56.45-1.85-58.33-4.1-1.58-3.31,1.76-6.74,3.27-9.52,12.5-23,35.57-48.84,45.86-71.54,2.71-5.98,3.94-8.85,1.46-15.43-4.6-12.19-22.26-46.69-29.58-57.2-.28-.4-.55-.76-.83-1.1-.84-1.64-2.14-2.73-3.91-3.15-1.69-.68-3.38-.54-5.01.31-.43.12-.86.26-1.32.42-12.05,4.36-46.38,22.35-57.17,29.66-5.82,3.94-6.48,7-7.71,13.45-4.69,24.47-.75,58.9-3.81,84.89-.37,3.14.38,7.87-2.82,9.66-2.83.76-44.81-26.27-50.01-30.3-12-9.29-10.46-11.83-10.73-26.04-.4-21.43.9-43.48,2.52-65.65l38.93-37.72c5.64-11.99-1.77-12.44-10.96-15.29-7.82-2.43-15.79-4.65-23.85-6.77.47-9.59.76-19.11.75-28.52,0-9.63,1.76-16.84-11.36-15l-52.25,28.58c-21.34-4.96-42.48-10.2-62.53-16.83-13.49-4.46-16.37-3.75-21.69-17.96-2.3-6.16-15.68-54.26-14.12-56.74,2.66-2.53,6.96-.41,10.06.17,25.74,4.78,57.45,18.74,82.21,21.51,6.53.73,9.64,1.01,15.13-3.38,10.17-8.14,37.52-35.6,45.26-45.81.29-.38.55-.76.79-1.13,1.3-1.31,1.94-2.88,1.79-4.7.13-1.82-.53-3.38-1.85-4.67-.25-.37-.51-.74-.81-1.12-7.87-10.11-35.59-37.2-45.87-45.2-5.55-4.32-8.66-4-15.17-3.18-24.72,3.1-56.24,17.48-81.91,22.61-3.1.62-7.37,2.79-10.06.3-1.59-2.46,11.14-50.74,13.36-56.92,5.13-14.29,8.01-13.61,21.45-18.25,20.25-7,41.63-12.58,63.22-17.89l47.91,25.37c13.14,1.66,11.29-5.53,11.16-15.15-.11-8.19-.45-16.46-.93-24.77,9.26-2.52,18.41-5.19,27.36-8.1,9.16-2.98,16.56-3.53,10.76-15.44l-43.33-40.87c-1.88-21.83-3.43-43.55-3.32-64.67.08-14.21-1.5-16.72,10.38-26.18,5.14-4.09,46.76-31.68,49.6-30.97,3.22,1.75,2.54,6.49,2.95,9.62,3.41,25.95-.07,60.43,4.95,84.83,1.32,6.43,2.01,9.48,7.89,13.34,10.88,7.16,45.45,24.69,57.56,28.89.46.16.89.29,1.32.4,1.65.83,3.34.95,5.02.25,1.77-.44,3.05-1.55,3.87-3.2.27-.35.55-.71.82-1.11,7.18-10.61,24.38-45.35,28.82-57.6,2.39-6.61,1.13-9.47-1.67-15.41-10.59-22.55-34.01-48.09-46.82-70.92-1.55-2.75-4.93-6.14-3.39-9.47,1.84-2.27,51.7-5.08,58.27-4.88,15.17.46,15.42,3.42,23.98,14.76,12.92,17.1,24.83,35.71,36.55,54.59l-9.33,53.4c2.48,13.01,8.74,9.03,17.86,5.93,7.75-2.63,15.51-5.52,23.27-8.54,5.26,8.03,10.62,15.9,16.16,23.52,5.66,7.79,8.47,14.66,18.01,5.46l25.48-53.84c20.18-8.53,40.36-16.72,60.48-23.14,13.54-4.32,15.44-6.59,28.1,1.78,5.48,3.63,44.58,34.68,44.78,37.6-.67,3.61-5.39,4.42-8.24,5.78-23.63,11.26-57.49,18.61-79.15,30.92-5.71,3.24-8.39,4.84-10.25,11.63-3.45,12.56-9.44,50.85-9.69,63.67-.01.48,0,.94.03,1.38-.28,1.82.12,3.47,1.32,4.85.96,1.55,2.42,2.42,4.24,2.69.42.15.85.3,1.31.43,12.31,3.55,50.66,9.18,63.68,9.61,7.03.23,9.35-1.85,14.14-6.35,18.18-17.04,35.23-47.21,52.98-66.44,2.14-2.32,4.32-6.59,7.96-6.16,2.73,1.05,20.81,47.6,22.65,53.91,4.25,14.57,1.52,15.72-6.62,27.37-12.27,17.57-26.29,34.65-40.63,51.64l-53.67,7.63c-11.61,6.38-5.88,11.1-.12,18.82,4.9,6.56,10.04,13.05,15.31,19.5-6.01,7.48-11.84,15.01-17.37,22.63-5.66,7.79-11.32,12.59.37,18.81l59.07,7.59c14.35,16.56,28.37,33.22,40.7,50.37,8.29,11.54,11.04,12.65,6.99,27.28Z";
function MalEmblem({ size = 22 }) {
  return (<svg width={size} height={size} viewBox="0 0 1080 1080" aria-hidden="true"><path d={EMBLEM_PATH} fill="#8000ff" /></svg>);
}

const KEY_LIVE = "mal_oversight_live_v1";
async function loadLive() { try { if (window.storage) { const r = await window.storage.get(KEY_LIVE); if (r && r.value) return JSON.parse(r.value); } } catch (e) {} return null; }
async function saveLive(o) { try { if (window.storage) await window.storage.set(KEY_LIVE, JSON.stringify(o)); } catch (e) {} }

const SCORE_W = { reporting: .15, responsiveness: .12, training: .12, audit: .12, findings: .12, timeliness: .12, quality: .10, cooperation: .07, risk: .08 };
const SCORE_LABEL = {
  reporting: "SAR/STR reporting quality", responsiveness: "Regulatory responsiveness", training: "Training completion",
  audit: "Audit performance", findings: "Regulatory findings (inverse)", timeliness: "Timeliness of reporting",
  quality: "Quality of submissions", cooperation: "Cooperation level", risk: "Risk indicators (inverse)",
};

const COURSES = [
  { id: "c1", title: "AML/CFT foundations", cat: "AML/CFT", mins: 45 },
  { id: "c2", title: "Sanctions & OFAC screening", cat: "Sanctions", mins: 40 },
  { id: "c3", title: "Travel Rule & recordkeeping", cat: "AML/CFT", mins: 30 },
  { id: "c4", title: "FATCA / CRS essentials", cat: "FATCA/CRS", mins: 35 },
  { id: "c5", title: "Risk typologies — remittance corridors", cat: "Typologies", mins: 50 },
  { id: "c6", title: "Beneficial ownership & PEPs", cat: "Due diligence", mins: 30 },
];

const REPORT_TYPES = [
  { id: "sar", name: "SAR", reg: "FinCEN BSA E-Filing" },
  { id: "str", name: "STR", reg: "goAML / local FIU" },
  { id: "fatca", name: "FATCA report", reg: "IRS / IGA" },
  { id: "crs", name: "CRS report", reg: "OECD / local tax authority" },
  { id: "questionnaire", name: "Regulatory questionnaire", reg: "Wolfsberg-style" },
  { id: "cert", name: "Annual compliance certification", reg: "Self-certification" },
  { id: "audit", name: "Audit finding & remediation", reg: "Independent audit" },
];

const DD_ITEMS = [
  { id: "onboarding", label: "Onboarding due diligence" }, { id: "edd", label: "Enhanced due diligence review" },
  { id: "periodic", label: "Periodic review" }, { id: "site", label: "Site-visit report" },
  { id: "interview", label: "Interview records" }, { id: "ra", label: "Risk assessment" },
  { id: "quest", label: "Compliance questionnaire" }, { id: "licence", label: "Regulatory licences" },
  { id: "corp", label: "Corporate documents" }, { id: "ubo", label: "Beneficial-ownership records" },
];

const FEED_KINDS = ["SAR", "STR", "Filing", "Certification", "Audit", "Correspondence", "Policy update", "Risk assessment", "Training", "Corrective action"];

/* ============================================================================
   STORAGE
============================================================================ */
const KEY = "mal_oversight_platform_v" + SEED_VERSION;
const mem = { d: null };
async function loadStore() { try { if (window.storage) { const r = await window.storage.get(KEY); if (r && r.value) return JSON.parse(r.value); } } catch (e) {} return mem.d; }
async function saveStore(o) { mem.d = o; try { if (window.storage) await window.storage.set(KEY, JSON.stringify(o)); } catch (e) {} }

/* ============================================================================
   BACKEND API — controls, cases, reg-changes (fallback: window.storage)
============================================================================ */
const API_BASE = "http://localhost:3001/api";
const API_USER = { id: "u-analyst", name: "Analyst", role: "ANALYST" };
const API_REVIEWER = { id: "u-co", name: "Jason Mullen", role: "CO" };
let _apiOk = null;
async function apiAvailable() {
  if (_apiOk !== null) return _apiOk;
  try { _apiOk = (await fetch(API_BASE + "/health")).ok; } catch { _apiOk = false; }
  return _apiOk;
}
async function apiFetch(path, opts = {}) {
  const headers = { ...(opts.body ? { "Content-Type": "application/json" } : {}), ...opts.headers };
  if (opts.auth !== false) {
    const u = opts.user || API_USER;
    headers["x-user-id"] = u.id;
    headers["x-user-name"] = u.name;
    headers["x-user-role"] = u.role;
  }
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText) || String(res.status));
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json") ? res.json() : null;
}
const FE_CTL_STATUS = { OPERATING: "Operating", PARTIAL: "Partial", GAP: "Gap", NOT_IMPLEMENTED: "Not implemented" };
const BE_CTL_STATUS = { Operating: "OPERATING", Partial: "PARTIAL", Gap: "GAP", "Not implemented": "NOT_IMPLEMENTED" };
const FE_CASE_STATUS = { OPEN: "Open", INVESTIGATING: "Investigating", PENDING_QA: "Pending QA", SAR_FILED: "SAR filed", CLOSED_NO_SAR: "Closed — No SAR", ESCALATED: "Escalated" };
const BE_DISP = { SAR: "SAR", "No SAR": "NO_SAR", Escalate: "ESCALATE" };
const FE_TASK_STATUS = { OPEN: "Open", IN_PROGRESS: "In progress", DONE: "Done" };
const BE_TASK_STATUS = { Open: "OPEN", "In progress": "IN_PROGRESS", Done: "DONE" };
function mapControlToOv(c) {
  return {
    status: FE_CTL_STATUS[c.status] || c.status,
    lastTested: c.lastTested ? String(c.lastTested).slice(0, 10) : null,
    evidence: (c.evidence || []).map(e => ({ id: e.id, name: e.name, type: e.type, at: String(e.at || "").slice(0, 10) || new Date().toISOString().slice(0, 10) })),
  };
}
function mapCaseFromApi(c) {
  const typ = typeof THREAT_ATLAS !== "undefined" ? THREAT_ATLAS.typologies.find(t => t.id === c.typologyId) : null;
  const dispMap = { SAR: "SAR", NO_SAR: "No SAR", ESCALATE: "Escalate" };
  return {
    id: c.id, title: c.title, typology: c.typologyId || "", typName: typ?.name || c.typologyId || "",
    sev: c.severity, source: c.source, cust: c.customerRef, corridor: c.corridor, amount: c.amount,
    status: FE_CASE_STATUS[c.status] || c.status, assignee: c.assigneeId ? "You" : "",
    opened: new Date(c.openedAt).getTime(), controls: c.controls || [],
    disposition: c.disposition ? dispMap[c.disposition] || c.disposition : "",
    rationale: c.rationale || "", reviewer: c.reviewerName || "",
    approvedAt: c.approvedAt ? new Date(c.approvedAt).getTime() : null,
    sarClockStart: c.sarClockStart ? new Date(c.sarClockStart).getTime() : null,
    sarFiled: c.sar?.filedAt ? new Date(c.sar.filedAt).getTime() : null,
    narrative: c.narrative || c.sar?.narrative || "",
    dpl: (c.dpl || []).map(e => ({ at: new Date(e.at).getTime(), who: e.who, act: e.action, note: e.note })),
  };
}
function mapSarFromApi(s) {
  return { id: s.id, case: s.caseId, cust: s.subject, typName: s.typology, filed: new Date(s.filedAt).getTime(), amount: s.amount };
}
async function fetchCasesFromApi() {
  const [casesRaw, sarsRaw] = await Promise.all([apiFetch("/cases", { auth: false }), apiFetch("/cases/sars", { auth: false })]);
  const cases = await Promise.all(casesRaw.map(async (c) => {
    try { return mapCaseFromApi(await apiFetch("/cases/" + encodeURIComponent(c.id), { auth: false })); }
    catch { return mapCaseFromApi(c); }
  }));
  const seq = cases.reduce((m, c) => Math.max(m, parseInt(String(c.id).slice(-4), 10) || 0), 0) + 1;
  return { cases, sars: sarsRaw.map(mapSarFromApi), seq };
}

function seed() {
  const today = new Date();
  const iso = (d) => new Date(d).toISOString();
  const daysFrom = (n) => iso(today.getTime() + n * 864e5);
  const agents = {};
  AGENTS_BASE.forEach((a, i) => {
    agents[a.id] = {
      feed: [
        { id: "f" + a.id + 1, kind: "Training", at: daysFrom(-2 - i), text: `Completed “Sanctions & OFAC screening”.`, actor: a.contacts[0].name },
        { id: "f" + a.id + 2, kind: "STR", at: daysFrom(-5 - i), text: `STR filed with ${a.jur} FIU re: structuring pattern.`, actor: a.contacts[0].name },
        { id: "f" + a.id + 3, kind: "Policy update", at: daysFrom(-9 - i), text: `Acknowledged updated sanctions-screening procedure.`, actor: a.contacts[0].name },
      ],
      registers: {
        sar: i % 2 === 0 ? [{ ref: "SAR-" + a.id + "-001", at: daysFrom(-12), status: "Filed", summary: "Rapid pass-through, no economic rationale" }] : [],
        str: [{ ref: "STR-" + a.id + "-001", at: daysFrom(-5 - i), status: "Filed", summary: "Structuring under wallet-tier limits" }],
        fatca: [], crs: [], questionnaire: [], cert: [{ ref: "CERT-2026", at: daysFrom(-40), status: "Submitted", summary: "Annual compliance certification 2026" }],
        audit: [], correspondence: [{ ref: "RC-" + a.id + "-1", at: daysFrom(-20), status: "Closed", summary: "Regulator query on corridor volumes" }],
        corrective: [],
      },
      training: COURSES.map((c, j) => ({ ...c, status: (j + i) % 3 === 0 ? "Not started" : "Completed", score: (j + i) % 3 === 0 ? null : 80 + ((i + j) % 20) })),
      dd: DD_ITEMS.reduce((o, d, j) => { o[d.id] = (j + i) % 4 === 0 ? "Outstanding" : "Complete"; return o; }, {}),
      acks: [],
    };
  });
  // program reviews (case files) — aligned to payout-agent-case-review skill
  const reviews = {
    "CASE-PK-0001": { id: "CASE-PK-0001", agent: "swiftx", reason: "Periodic review", status: "Remediation", level: "Findings",
      start: daysFrom(-13), foDue: daysFrom(20), assignedTo: "Tayel Mohamed", country: "Pakistan",
      txStart: "2026-03-01", txEnd: "2026-05-31", txGroup: "FinCrime Analytics",
      findings: [{ ref: "F-1", desc: "Two payouts without matching authorised-channel settlement leg", sev: "High", standard: "GA-4 §6 / FERA §21", status: "Open" }],
      remediation: [{ action: "Implement settlement-leg match control", owner: "SwiftX", due: daysFrom(10), status: "In progress" }, { action: "Train CO on IVTS prohibition", owner: "SwiftX", due: daysFrom(-2), status: "Done" }],
      cleared: false },
    "CASE-AE-0007": { id: "CASE-AE-0007", agent: "gulf", reason: "Risk-based onboarding", status: "Working", level: "", foDue: daysFrom(4),
      start: daysFrom(-6), assignedTo: "Tayel Mohamed", country: "UAE", txStart: "", txEnd: "", txGroup: "", findings: [], remediation: [], cleared: false },
    "CASE-PH-0012": { id: "CASE-PH-0012", agent: "pearl", reason: "Periodic review", status: "Closed", level: "No findings",
      start: daysFrom(-60), end: daysFrom(-30), foDue: daysFrom(-35), assignedTo: "Tayel Mohamed", country: "Philippines",
      txStart: "2026-01-01", txEnd: "2026-03-31", txGroup: "FinCrime Analytics", findings: [], remediation: [], cleared: true },
    "CASE-BD-0003": { id: "CASE-BD-0003", agent: "thunes", reason: "Periodic review", status: "Assigned", level: "", foDue: daysFrom(12),
      start: daysFrom(-1), assignedTo: "Tayel Mohamed", country: "Bangladesh", txStart: "", txEnd: "", txGroup: "", findings: [], remediation: [], cleared: false },
    "CASE-CARD-RAIN-0001": { id: "CASE-CARD-RAIN-0001", agent: "rain", reason: "Risk-based onboarding — MLRO contract review", status: "Working", level: "Significant findings",
      start: daysFrom(-5), foDue: daysFrom(7), assignedTo: "Tayel Mohamed (MLRO)", country: "United States", txStart: "", txEnd: "", txGroup: "",
      findings: [
        { ref: "R-1", desc: "Issuing depository bank unnamed in MSA — cannot map primary SAR/CTR filing responsibility", sev: "Critical", standard: "BSA filing allocation", status: "Open" },
        { ref: "R-2", desc: "Schedule 1 Terms of Service control over the MSA and are unilaterally amendable — AML/sanctions allocation alterable without Mal consent", sev: "Critical", standard: "Contract control / flow-down", status: "Open" },
        { ref: "R-3", desc: "Partner bears 100% of fraud, chargeback, force-post and under-collateralisation losses — uncapped, no commensurate control", sev: "Critical", standard: "Financial exposure", status: "Open" },
        { ref: "R-4", desc: "Perimeter mismatch — USD Visa card + crypto settlement (incl. B2C) vs board-approved stablecoin off-ramp; re-run MSB perimeter; B2C triggers Reg E/Z/UDAAP", sev: "Critical", standard: "Program §14 governance gate", status: "Open" }],
      remediation: [], cleared: false },
    "CASE-TECH-OSC-0001": { id: "CASE-TECH-OSC-0001", agent: "oscilar", reason: "Risk-based onboarding — rule-library gap analysis", status: "Working", level: "Significant findings",
      start: daysFrom(-8), foDue: daysFrom(9), assignedTo: "Tayel Mohamed (MLRO)", country: "Pakistan", txStart: "", txEnd: "", txGroup: "",
      findings: [
        { ref: "O-1", desc: "Zero OFAC/sanctions screening rules in the library — largest gap (Payoneer-style OFAC failure modes)", sev: "Critical", standard: "OFAC / 31 CFR 501", status: "Open" },
        { ref: "O-2", desc: "Zero crypto/USDC monitoring rules — Mal's #1 inherent-risk vector (CVC: wallet adjacency, mixer/tumbler, chain-hopping)", sev: "Critical", standard: "FIN-2025-CVC", status: "Open" },
        { ref: "O-3", desc: "No real-time preventive holds for the Pakistan corridor — detection only; needs RTRA (dwell time, age-scaled caps)", sev: "Critical", standard: "Corridor controls", status: "Open" },
        { ref: "O-4", desc: "Corridor-blind / flat geography and hardcoded OOTB defaults — no SBP/provincial weighting; needs MRM tuning + zero-hit KRI", sev: "High", standard: "Model risk management", status: "Open" }],
      remediation: [], cleared: false },
    "CASE-BANK-ZEN-0001": { id: "CASE-BANK-ZEN-0001", agent: "zenus", reason: "AML/BSA gap analysis — PSA alignment", status: "Remediation", level: "Findings",
      start: daysFrom(-15), foDue: daysFrom(14), assignedTo: "Dr. Angel Wesley", country: "United States", txStart: "", txEnd: "", txGroup: "",
      findings: [
        { ref: "Z-1", desc: "SAR/CTR filing institution unresolved — Zenus is a PR IFE, not a US depository; Path A vs B unconfirmed", sev: "High", standard: "BSA / FinCEN", status: "Open" },
        { ref: "Z-2", desc: "MSB / regulatory-perimeter determination treated as pending in Program but closed in the PSA", sev: "High", standard: "31 CFR 1022.380 / .210", status: "Open" },
        { ref: "Z-3", desc: "Schedule 3.6(a) omits an independent AML audit despite cross-reference", sev: "High", standard: "AML program pillar 4", status: "Open" }],
      remediation: [{ action: "Confirm SAR/CTR filer + OFAC/ARBP allocation in a Program Schedule", owner: "Mal MLRO + Zenus", due: daysFrom(14), status: "In progress" }], cleared: false },
  };
  const broadcasts = [
    { id: "b1", at: daysFrom(-3), title: "Updated sanctions-screening SLA", body: "OFAC SDN deltas must be live in screening within 24 hours; full batch re-screen on each publication. Confirm your screening is configured accordingly.", behavior: "Confirm 24h SDN screening is applied", sev: "high", jur: "All" },
    { id: "b2", at: daysFrom(-10), title: "Pakistan corridor — settlement-leg integrity", body: "Every payout must have a matching authorised-channel settlement leg. No hawala/hundi settlement anywhere in the chain.", behavior: "Confirm no IVTS settlement in chain", sev: "crit", jur: "Pakistan" },
  ];
  const library = Object.entries(JUR_NEWS).flatMap(([jur, items]) =>
    items.map((it, k) => ({ id: jur + k, jur, type: it.type, sev: it.sev, text: it.text, at: daysFrom(-(k + 1) * 2), source: "Partner desk" })));
  return { v: SEED_VERSION, agents, partners: [], reviews, broadcasts, library, tasks: [
    { id: "t1", agent: "gulf", title: "Provide independent AML audit report", due: daysFrom(3), status: "Open" },
    { id: "t2", agent: "swiftx", title: "Close finding F-1 (settlement-leg control)", due: daysFrom(10), status: "Open" },
  ], speakup: [], audit: [{ id: "a0", at: daysFrom(-1), actor: "System", role: "system", action: "Platform seeded", target: "—" }] };
}

/* ============================================================================
   COMPUTE
============================================================================ */
const overall = (a) => Math.round(Object.keys(SCORE_W).reduce((s, k) => s + a.scores[k] * SCORE_W[k], 0));
function ratingFor(sc) { return sc >= 85 ? { t: "Low", c: "#17a34a" } : sc >= 70 ? { t: "Medium", c: "#1e63e9" } : sc >= 55 ? { t: "High", c: "#f59e0b" } : { t: "Critical", c: "#ef4444" }; }
const screeningAdj = (s) => { if (!s || s.error) return 0; const sanc = (s.sanctions || []).length > 0; const adv = (s.adverseMedia || []).some(m => m.sev === "crit" || m.sev === "high"); if (sanc) return -40; if (adv || s.riskFlag === "High") return -25; if (s.riskFlag === "Medium") return -12; return 0; };
const effScore = (base, slice) => Math.max(0, Math.min(100, overall(base) + screeningAdj(slice && slice.screening)));
const trendOf = (a) => a.history.length >= 2 ? a.history[a.history.length - 1] - a.history[a.history.length - 2] : 0;
function trainingRate(slice) { const t = slice.training; return Math.round(100 * t.filter(c => c.status === "Completed").length / t.length); }
function ddStatus(slice) { const v = Object.values(slice.dd); return { done: v.filter(x => x === "Complete").length, total: v.length }; }
function bizDays(a, b) { const A = new Date(a), B = new Date(b); let d = new Date(A), n = 0, step = B < A ? -1 : 1; const inc = B < A ? -1 : 0; n = inc; while (d.toDateString() !== B.toDateString()) { d.setDate(d.getDate() + step); if (d.getDay() !== 0 && d.getDay() !== 6) n += step; } return n; }
function slaStatus(foDue) { const cd = bizDays(new Date(), foDue); return { cd, st: cd < 0 ? "Overdue" : cd <= 3 ? "Due soon" : "On track", c: cd < 0 ? "#ef4444" : cd <= 3 ? "#f59e0b" : "#17a34a" }; }
function earlyWarnings(a, slice, reviews) {
  const w = [];
  if (overall(a) < 60) w.push("Low compliance score");
  if (trendOf(a) < 0) w.push("Declining trend");
  if (trainingRate(slice) < 70) w.push("Training below target");
  if (a.scores.risk < 55) w.push("Elevated risk indicators");
  const rs = Object.values(reviews).filter(r => r.agent === a.id);
  if (rs.some(r => r.findings?.some(f => f.sev === "Critical" && f.status === "Open"))) w.push("Open critical finding");
  if (rs.some(r => r.status !== "Closed" && slaStatus(r.foDue).cd < 0)) w.push("Overdue program review");
  return w;
}
const fmtDate = (s) => new Date(s).toLocaleDateString();
const fmtDT = (s) => new Date(s).toLocaleString();

/* ============================================================================
   STYLES
============================================================================ */
const CSS = `
:root{--page:#c3d2e7;--surface:#ffffff;--elevated:#f5f3fb;--ink:#ffffff;
--text:#0c0d14;--muted:#5b6472;--line:#e4e7ef;--panel:#ffffff;--panel2:#f4f1fb;
--gold:#8000ff;--gold2:#8f3bff;--brand600:#6a00d6;--brand50:#f5edff;--brand100:#f2e7ff;
--green:#17a34a;--amber:#f59e0b;--red:#ef4444;--blue:#1e63e9;--violet:#8b5cf6;
--sans:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;}
*{box-sizing:border-box}
.mpc{font-family:var(--sans);min-height:100vh;color:var(--text);
background:radial-gradient(1200px 700px at 0% -10%,rgba(143,59,255,.20),transparent 60%),radial-gradient(900px 600px at 120% 0%,rgba(30,99,233,.14),transparent 60%),radial-gradient(900px 600px at 50% 110%,rgba(232,213,255,.55),transparent 70%),var(--page);background-attachment:fixed;-webkit-font-smoothing:antialiased;}
.mpc *::-webkit-scrollbar{height:8px;width:8px}.mpc *::-webkit-scrollbar-thumb{background:rgba(0,0,0,.18);border-radius:8px}
.mono{font-family:var(--mono)}.muted{color:var(--muted)}
.topbar{display:flex;align-items:center;gap:14px;padding:11px 18px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.78);backdrop-filter:blur(10px);position:sticky;top:0;z-index:30;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:9px;font-weight:700;color:var(--text)}
.brand b{font-weight:800}
.brandmark{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,var(--brand100),var(--brand50));border:1px solid #e8d5ff}
.brandmark svg{display:block}
.spacer{flex:1}
.seg{display:flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:#fff}
.seg button{background:transparent;color:var(--muted);border:none;padding:7px 15px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:var(--sans)}
.seg button.on{background:var(--gold);color:#fff}
.pill{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;font-size:12.5px;color:var(--text);cursor:pointer}
.statchip{display:flex;align-items:center;gap:7px;padding:6px 11px;border:1px solid var(--line);border-radius:12px;background:#fff}
.statchip .v{font-family:var(--mono);font-weight:700}
.ticker{display:flex;align-items:stretch;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#f7f2ff,#ffffff);overflow:hidden}
.ticker .live{display:flex;align-items:center;gap:8px;padding:8px 13px;background:var(--red);color:#fff;font-weight:800;font-size:11.5px;white-space:nowrap;letter-spacing:.4px}
.ticker .track{overflow:hidden;flex:1;display:flex;align-items:center}
.ticker .crawl{display:inline-flex;gap:40px;white-space:nowrap;padding-left:28px;animation:crawl 55s linear infinite}
.ticker:hover .crawl{animation-play-state:paused}
.ticker .item{display:inline-flex;align-items:center;gap:9px;font-size:13px;color:var(--text)}
.ticker .livebtn{display:inline-flex;align-items:center;gap:7px;border:none;border-left:1px solid var(--line);background:#fff;color:var(--gold);font-weight:700;font-size:12px;padding:0 14px;cursor:pointer;font-family:var(--sans)}
.ticker .livebtn:hover{background:var(--brand50)}.ticker .livebtn:disabled{opacity:.6;cursor:default}
.tag{font-family:var(--mono);font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px}
.dot{width:8px;height:8px;border-radius:50%;flex:none}
.catdot{width:10px;height:10px;border-radius:50%;flex:none}
.pulse{width:9px;height:9px;border-radius:50%;background:#fff;animation:pulse 1.2s infinite}
@keyframes crawl{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.7)}70%{box-shadow:0 0 0 7px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}
.shell{display:grid;grid-template-columns:236px 1fr;min-height:calc(100vh - 112px)}
.rail{border-right:1px solid var(--line);padding:13px 9px;display:flex;flex-direction:column;gap:3px;position:sticky;top:112px;align-self:start;height:calc(100vh - 112px);overflow:auto}
.railhead{font-size:10px;letter-spacing:.7px;color:var(--muted);font-weight:700;padding:8px 12px 4px}
.navbtn{display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:12px;cursor:pointer;color:var(--muted);font-size:13.5px;font-weight:600;border:1px solid transparent}
.navbtn:hover{background:#fff;color:var(--text)}
.navbtn.active{background:var(--brand50);color:var(--brand600);border-color:#e8d5ff;box-shadow:inset 2px 0 0 var(--gold)}
.navbtn .badge{margin-left:auto;font-family:var(--mono);font-size:11px;background:var(--red);color:#fff;border-radius:999px;padding:1px 7px;font-weight:800}
.main{padding:20px 24px;max-width:1240px}
.h1{font-size:21px;font-weight:800;margin:0;letter-spacing:-.01em}.sub{color:var(--muted);font-size:13px;margin:4px 0 16px;max-width:900px}
.grid{display:grid;gap:13px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:15px;box-shadow:0 1px 2px rgb(0 0 0/.04),0 8px 24px -12px rgb(0 0 0/.10)}
.card h3{margin:0 0 10px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px}
.kpi{font-family:var(--mono);font-size:27px;font-weight:800;line-height:1;color:var(--text)}
.row{display:flex;align-items:center;gap:10px}
.btn{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--text);font-weight:700;font-size:12.5px;cursor:pointer;transition:.15s}
.btn:hover{background:#faf7ff;border-color:#e0cdff}.btn.gold{background:var(--gold);color:#fff;border:none}.btn.gold:hover{background:var(--gold2)}
.btn.ghost{background:transparent;border-color:transparent;color:var(--text)}.btn.ghost:hover{background:rgba(0,0,0,.04)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.tablewrap{overflow:auto;border:1px solid var(--line);border-radius:16px;background:#fff}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th{text-align:left;color:var(--muted);font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;padding:9px 11px;background:#faf9fe;position:sticky;top:0;border-bottom:1px solid var(--line)}
td{padding:9px 11px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--text)}
tr:last-child td{border-bottom:none}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}
.bar{height:7px;border-radius:999px;background:#eceaf6;overflow:hidden;border:1px solid var(--line)}.bar>span{display:block;height:100%}
.heat{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.tile{border:1px solid var(--line);border-radius:14px;padding:13px;background:#fff}
.feeditem{display:flex;gap:11px;padding:12px 0;border-bottom:1px solid var(--line)}.feeditem:last-child{border-bottom:none}
.av{width:34px;height:34px;border-radius:10px;flex:none;display:grid;place-items:center;font-weight:800;background:var(--brand50);font-size:13px}
.overlay{position:fixed;inset:0;background:rgba(20,12,40,.4);backdrop-filter:blur(3px);display:grid;place-items:center;z-index:60;padding:18px}
.modal{width:100%;max-width:560px;background:#fff;border:1px solid var(--line);border-radius:24px;padding:20px;max-height:90vh;overflow:auto;box-shadow:0 24px 64px -24px rgb(0 0 0/.3)}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:11px}
.field label{font-size:12px;color:var(--muted);font-weight:600}
.input,select,textarea{background:#faf9fe;border:1px solid var(--line);border-radius:12px;color:var(--text);padding:9px 11px;font-size:13px;font-family:var(--sans);width:100%}
textarea{min-height:70px;resize:vertical}
.input:focus,select:focus,textarea:focus{outline:2px solid var(--gold);outline-offset:1px;border-color:transparent}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid var(--gold);border-radius:14px;padding:11px 17px;display:flex;gap:10px;z-index:80;box-shadow:0 12px 32px -16px rgb(128 0 255/.4);animation:pop .25s ease;color:var(--text)}
@keyframes pop{from{transform:translate(-50%,12px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
@keyframes lcfill{from{width:0}to{width:100%}}
.profhead{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.bigav{width:64px;height:64px;border-radius:16px;display:grid;place-items:center;font-weight:900;font-size:22px;background:linear-gradient(135deg,#efe9fb,#ffffff);border:1px solid var(--line);color:var(--brand600)}
.tabs2{display:flex;gap:6px;border-bottom:1px solid var(--line);margin:14px 0;flex-wrap:wrap}
.tabs2 button{background:transparent;border:none;color:var(--muted);font-weight:700;font-size:13px;padding:8px 12px;cursor:pointer;border-bottom:2px solid transparent;font-family:var(--sans)}
.tabs2 button.on{color:var(--brand600);border-bottom-color:var(--gold)}
.badgegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:11px}
.badge2{display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;padding:15px 11px;border-radius:16px;border:1px solid var(--line);background:#fff}
.badge2.on{border-color:var(--gold);background:linear-gradient(180deg,var(--brand50),#fff)}
.badge2 .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#f1eefb;color:var(--brand600)}
.badge2.on .ic{background:var(--gold);color:#fff}
.ring{position:relative;width:46px;height:46px;border-radius:50%}
.ring .hole{position:absolute;inset:5px;border-radius:50%;background:#fff;display:grid;place-items:center;font-family:var(--mono);font-weight:800;font-size:13px}
@media (max-width:880px){.shell{grid-template-columns:1fr}.rail{position:static;height:auto;flex-direction:row;flex-wrap:wrap;border-right:none;border-bottom:1px solid var(--line)}}
@media (prefers-reduced-motion:reduce){.ticker .crawl{animation:none}.pulse{animation:none}}
`;

/* ============================================================================
   APP
============================================================================ */
/* ============================================================================
   PARTNER ONBOARDING (light) + DUE DILIGENCE + AUTOMATIC SCREENING
   Applying the partner-third-party-due-diligence skill:
   partnership-not-interrogation — partners give the minimum; Mal verifies.
============================================================================ */
const HIGH_CORRIDORS = ["Pakistan", "Bangladesh", "Egypt"]; // Very-High/High corridors → Tier 3 by default
function suggestTier(category, jur) {
  if (category === "Payout partners") return HIGH_CORRIDORS.includes(jur) ? "Tier 3 — EDD" : "Tier 2 — Elevated";
  if (category === "Technology & processors") return "Tier 3 — EDD"; // touch CDD/screening/critical systems
  if (category === "Banking partner" || category === "Card & settlement") return "Tier 2 — Elevated";
  return "Tier 2 — Elevated";
}
const TIER_NOTE = {
  "Tier 1 — Standard": "CO or delegate · refresh 24 months",
  "Tier 2 — Elevated": "CO + senior management · refresh 12 months",
  "Tier 3 — EDD": "CO + senior management + Board notification · refresh 6–12 months",
};

// LIGHT intake — the minimum that is satisfactory to start. Mal conducts the deep DD.
const COMMON_LIGHT = [
  { title: "About your business", why: "So we can identify you and confirm you exist on the public register. This is all we need to get started.", fields: [
    { k: "entityName", label: "Legal entity name", t: "text", required: true },
    { k: "country", label: "Country of incorporation", t: "text", required: true },
    { k: "regNumber", label: "Company / registration number", t: "text", required: true },
    { k: "website", label: "Website", t: "text" },
    { k: "jurisdictions", label: "Markets / corridors you serve (comma-separated)", t: "text", required: true },
    { k: "products", label: "What you do for Mal (one line)", t: "text" },
  ]},
  { title: "Who we contact", why: "So reviews and updates reach the right person without chasing.", fields: [
    { k: "coName", label: "Compliance contact name", t: "text", required: true },
    { k: "coEmail", label: "Compliance contact email", t: "text", required: true },
  ]},
  { title: "Licensing", why: "We confirm this directly with the regulator — you don't need to attach anything yet.", fields: [
    { k: "regulator", label: "Primary regulator", t: "text" },
    { k: "licenceNumber", label: "Licence / registration number", t: "text" },
  ]},
  { title: "Owners & directors", why: "We verify ownership independently. Just tell us who you know — a tap, not paperwork.", fields: [
    { k: "ubos", label: "Beneficial owners / directors", t: "list", cols: [ { k: "name", label: "Name" }, { k: "role", label: "Role / %" }, { k: "nationality", label: "Nationality" } ] },
    { k: "pep", label: "Are any owners or directors a politically exposed person (PEP)?", t: "yn", required: true },
  ]},
  { title: "Anything we should know", why: "It always lands better coming from you. We check public records either way, so a heads-up keeps us aligned.", fields: [
    { k: "priorIssues", label: "Any past regulatory action, enforcement, or material litigation?", t: "yn", required: true },
    { k: "priorNotes", label: "If yes, a short note (optional)", t: "area" },
  ]},
  { title: "Existing documents (optional)", why: "If you already hold these, share a link and we won't ask twice — we accept what you have.", fields: [
    { k: "artefacts", label: "Links to licences, audited financials, SOC 2, or a completed Wolfsberg questionnaire", t: "area" },
  ]},
  { title: "Our shared commitments", why: "These are the same commitments our own banks require of us. Agreeing up front is what keeps us aligned and the regulators comfortable.", fields: [
    { k: "sanctionsAttest", label: "You and your owners are not sanctioned, and you screen against sanctions lists", t: "yn", required: true },
    { k: "amlAttest", label: "You maintain an AML/CFT programme appropriate to your activity", t: "yn", required: true },
    { k: "notifyAttest", label: "You'll tell Mal promptly of any change in ownership, licence, sanctions status or a security incident", t: "yn", required: true },
    { k: "consent", label: "You authorise Mal to verify these details and screen you (registries, sanctions, adverse media)", t: "yn", required: true },
  ]},
];
const CATEGORY_LIGHT = {
  "Payout partners": [{ title: "Payout — quick check", why: "Payouts must reach beneficiaries only through authorised channels.", fields: [
    { k: "corridors", label: "Payout corridors", t: "text" },
    { k: "ivtsAttest", label: "You settle only through authorised channels — no hawala / hundi / IVTS", t: "yn", required: true },
  ]}],
  "Banking partner": [{ title: "Banking — quick check", why: "Confirms the licence type behind the rails you provide.", fields: [
    { k: "charterType", label: "Charter / licence type", t: "text" } ]}],
  "Card & settlement": [{ title: "Card & settlement — quick check", why: "Identifies the scheme rules that apply to the programme.", fields: [
    { k: "scheme", label: "Card scheme(s)", t: "text" } ]}],
  "Technology & processors": [{ title: "Technology — quick check", why: "We treat processors as never-CDD-reliance and validate your controls ourselves.", fields: [
    { k: "serviceType", label: "Service type", t: "select", options: ["Screening / KYT", "Core ledger", "Identity verification", "Other"] } ]}],
};
const schemaFor = (cat) => [...COMMON_LIGHT, ...(CATEGORY_LIGHT[cat] || [])];

function WizField({ f, v, set }) {
  if (f.t === "list") {
    const rows = v[f.k] || [];
    const addRow = () => set(f.k, [...rows, f.cols.reduce((o, c) => (o[c.k] = "", o), {})]);
    const setRow = (i, ck, val) => set(f.k, rows.map((r, j) => j === i ? { ...r, [ck]: val } : r));
    const delRow = (i) => set(f.k, rows.filter((_, j) => j !== i));
    return (
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{f.label}</label>
        {rows.length > 0 && <div className="tablewrap" style={{ marginTop: 6 }}><table>
          <thead><tr>{f.cols.map(c => <th key={c.k}>{c.label}</th>)}<th></th></tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i}>{f.cols.map(c => <td key={c.k}><input className="input" value={row[c.k] || ""} onChange={e => setRow(i, c.k, e.target.value)} /></td>)}<td><button className="btn ghost" onClick={() => delRow(i)}><X size={13} /></button></td></tr>)}</tbody>
        </table></div>}
        <button className="btn ghost" style={{ marginTop: 6 }} onClick={addRow}><Plus size={13} /> Add</button>
      </div>
    );
  }
  return (
    <div className="field" style={(f.t === "area") ? { gridColumn: "1 / -1" } : {}}>
      <label>{f.label}{f.required ? " *" : ""}</label>
      {f.t === "area" ? <textarea value={v[f.k] || ""} onChange={e => set(f.k, e.target.value)} />
        : f.t === "select" ? <select value={v[f.k] || ""} onChange={e => set(f.k, e.target.value)}><option value="">Select…</option>{f.options.map(o => <option key={o}>{o}</option>)}</select>
        : f.t === "yn" ? <div className="row" style={{ gap: 8 }}>{["Y", "N"].map(o => <button key={o} type="button" className={"btn" + (v[f.k] === o ? " gold" : "")} style={{ flex: 1 }} onClick={() => set(f.k, o)}>{o === "Y" ? "Yes" : "No"}</button>)}</div>
        : <input className="input" type={f.t === "date" ? "date" : f.t === "num" ? "number" : "text"} value={v[f.k] || ""} onChange={e => set(f.k, e.target.value)} />}
    </div>
  );
}

function OnboardingWizard({ category, onCancel, onComplete, invite = false }) {
  const sections = schemaFor(category);
  const [v, setV] = useState({});
  const [step, setStep] = useState(0); // 0 = intro, 1..N = sections, N+1 = review
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const total = sections.length + 2;
  const inSection = step >= 1 && step <= sections.length;
  const sec = inSection ? sections[step - 1] : null;
  const secReady = !sec || sec.fields.filter(f => f.required).every(k2 => { const val = v[k2.k]; return val != null && String(val).trim() !== ""; });
  const pct = Math.round((step / (total - 1)) * 100);
  const fieldCount = sections.flatMap(s => s.fields).length;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      {!invite && <button className="btn ghost" style={{ marginBottom: 10 }} onClick={onCancel}>← Onboarding</button>}
      {/* progress */}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{step === 0 ? "Welcome" : step > sections.length ? "Review" : `Step ${step} of ${sections.length}`}</span>
        <span className="muted mono" style={{ fontSize: 11 }}>{pct}%</span>
      </div>
      <div className="bar" style={{ marginBottom: 16 }}><span style={{ width: pct + "%", background: "linear-gradient(90deg,var(--gold),var(--gold2))" }} /></div>

      {step === 0 && (
        <div className="card">
          <h1 className="h1" style={{ marginBottom: 6 }}>Become an approved Mal partner</h1>
          <p className="sub" style={{ marginBottom: 14 }}>A few minutes is all it takes. We ask for the minimum — about {fieldCount} quick questions — and our team verifies the rest independently, so you’re not buried in paperwork.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["Quick by design", "Only what we genuinely need to start — most of it is a tap."], ["We do the heavy lifting", "Mal verifies licences, ownership and screening on our side."], ["The same bar our banks set us", "These commitments keep us aligned and regulators comfortable."]].map(([t, d], i) => (
              <div className="row" key={i} style={{ gap: 11, alignItems: "flex-start" }}><ShieldCheck size={18} color="var(--gold)" style={{ marginTop: 1 }} /><div><b style={{ fontSize: 13.5 }}>{t}</b><div className="muted" style={{ fontSize: 12.5 }}>{d}</div></div></div>
            ))}
          </div>
          <button className="btn gold" style={{ marginTop: 18 }} onClick={() => setStep(1)}>Start <ChevronRight size={15} /></button>
        </div>
      )}

      {inSection && (
        <div className="card">
          <h3 style={{ color: "var(--text)", textTransform: "none", fontSize: 16, letterSpacing: 0 }}>{sec.title}</h3>
          {sec.why && <div className="row" style={{ gap: 8, alignItems: "flex-start", background: "var(--brand50)", borderRadius: 10, padding: "9px 11px", margin: "4px 0 14px" }}><Lock size={13} color="var(--brand600)" style={{ marginTop: 2 }} /><span style={{ fontSize: 12, color: "var(--brand600)" }}>{sec.why}</span></div>}
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {sec.fields.map(f => <WizField key={f.k} f={f} v={v} set={set} />)}
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
            <button className="btn ghost" onClick={() => setStep(step - 1)}>← Back</button>
            <button className="btn gold" disabled={!secReady} onClick={() => setStep(step + 1)}>{step === sections.length ? "Review" : "Next"} <ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {step === sections.length + 1 && (
        <div className="card">
          <h3 style={{ color: "var(--text)", textTransform: "none", fontSize: 16, letterSpacing: 0 }}>Review & submit</h3>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>A quick look before you send. You can go back to change anything.</p>
          {sections.map((s, si) => (
            <div key={si} style={{ marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: 12.5 }}>{s.title}</b><button className="btn ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setStep(si + 1)}>Edit</button></div>
              {s.fields.filter(f => f.t !== "list").map(f => <div key={f.k} className="row" style={{ justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}><span className="muted">{f.label}</span><span style={{ fontWeight: 600, textAlign: "right", maxWidth: 280 }}>{v[f.k] === "Y" ? "Yes" : v[f.k] === "N" ? "No" : (v[f.k] || "—")}</span></div>)}
              {s.fields.filter(f => f.t === "list").map(f => <div key={f.k} className="row" style={{ justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}><span className="muted">{f.label}</span><span style={{ fontWeight: 600 }}>{(v[f.k] || []).length} listed</span></div>)}
            </div>
          ))}
          <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
            <button className="btn ghost" onClick={() => setStep(sections.length)}>← Back</button>
            <button className="btn gold" onClick={() => onComplete(category, v)}><Check size={15} /> Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Onboarding({ store, category, setCategory, onboard, viewProfile }) {
  if (category) return <OnboardingWizard category={category} onCancel={() => setCategory(null)} onComplete={(c, v) => { onboard(c, v); setCategory(null); }} />;
  const onboarded = store.partners || [];
  const [copied, setCopied] = useState("");
  return (
    <>
      <h1 className="h1">Onboarding & due-diligence</h1>
      <p className="sub">Partnership, not interrogation. Partners give the minimum that’s satisfactory to start; Mal runs the deep due diligence — independent verification plus automatic sanctions, adverse-media and ownership screening. Pick a category to open its light intake.</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
        {CATEGORIES.map(cat => (
          <div className="card" key={cat.id}>
            <div className="row" style={{ gap: 9 }}><span className="catdot" style={{ background: cat.color }} /><b>{cat.id}</b></div>
            <div className="muted" style={{ fontSize: 12, margin: "6px 0 12px" }}>{cat.note}. Light intake ({schemaFor(cat.id).flatMap(s => s.fields).length} questions) — Mal verifies the rest.</div>
            <button className="btn gold" onClick={() => setCategory(cat.id)}><FileSignature size={14} /> Open intake form</button>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Send a fillable link</h3>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Share a link and the partner completes the light intake themselves; it arrives as a new profile with screening started. They never see how we tier or score them.</p>
        {[{ id: "choose", name: "Let the partner pick their category" }, ...CATEGORIES].map(cat => {
          const link = (() => { try { return window.location.origin + window.location.pathname + "#intake=" + encodeURIComponent(cat.id); } catch (e) { return "#intake=" + encodeURIComponent(cat.id); } })();
          return (
            <div className="row" key={cat.id} style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, minWidth: 160, fontWeight: 600 }}>{cat.name || cat.id}</span>
              <input className="input mono" readOnly value={link} style={{ flex: 1, minWidth: 200, fontSize: 11 }} onFocus={e => e.target.select()} />
              <button className="btn" onClick={() => { try { navigator.clipboard.writeText(link); } catch (e) {} setCopied(cat.id); setTimeout(() => setCopied(""), 1500); }}>{copied === cat.id ? "Copied" : "Copy"}</button>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Onboarded via this portal</h3>
        {onboarded.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>No partners onboarded through the portal yet. Completing an intake creates the profile and starts screening.</div> :
          <div className="tablewrap"><table>
            <thead><tr><th>Partner</th><th>Category</th><th>Jurisdiction</th><th>Risk tier</th><th>Stage</th><th></th></tr></thead>
            <tbody>{onboarded.map(p => (
              <tr key={p.id}><td style={{ fontWeight: 700 }}>{p.name}</td><td><span className="chip" style={{ background: (CATEGORIES.find(c => c.id === p.category)?.color || "#888") + "22", color: CATEGORIES.find(c => c.id === p.category)?.color || "#888" }}>{p.category}</span></td><td>{p.jur}</td><td>{p.riskTier || suggestTier(p.category, p.jur)}</td><td className="muted" style={{ fontSize: 12 }}>{p.lifecycle || "Verification & DD"}</td><td><button className="btn ghost" onClick={() => viewProfile(p.id)}>Open <ChevronRight size={13} /></button></td></tr>
            ))}</tbody>
          </table></div>}
      </div>
    </>
  );
}

/* ---- Automatic screening panel (adverse media · sanctions · UBO · directors · feedback) ---- */
function ScreeningPanel({ partnerId, base, screening, onRun, loading }) {
  const ranOnce = useRef(false);
  useEffect(() => { if (!screening && !loading && !ranOnce.current) { ranOnce.current = true; onRun(); } }, []); // eslint-disable-line
  const flagColor = (f) => f === "High" ? "var(--red)" : f === "Medium" ? "var(--amber)" : f === "Low" ? "var(--green)" : "var(--muted)";
  const Block = ({ title, items, render, empty }) => (
    <div className="card"><h3>{title}</h3>
      {(!items || items.length === 0) ? <div className="muted" style={{ fontSize: 12.5 }}>{empty}</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items.map((it, i) => <div key={i}>{render(it)}</div>)}</div>}
    </div>
  );
  return (
    <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 13 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, color: "var(--gold)" }}><Radio size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Automatic screening — adverse media · sanctions · ownership · feedback</h3>
        <div className="row" style={{ gap: 8 }}>
          {screening?.at && <span className="muted mono" style={{ fontSize: 11 }}>run {fmtDT(screening.at)}</span>}
          <button className="btn" onClick={onRun} disabled={loading}><Radio size={13} /> {loading ? "Screening…" : "Re-run"}</button>
        </div>
      </div>
      {loading && <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>Searching online sources for {base.name} ({base.juris.join(", ")})…</div>}
      {!loading && !screening && <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>No screening yet — starting automatically…</div>}
      {!loading && screening?.error && <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>Couldn’t reach the screening source. Click Re-run to try again.</div>}
      {screening && !screening.error && (
        <>
          <div className="row" style={{ gap: 12, margin: "12px 0", flexWrap: "wrap" }}>
            <span className="chip" style={{ background: flagColor(screening.riskFlag) + "22", color: flagColor(screening.riskFlag) }}>Screening risk: {screening.riskFlag || "—"}</span>
            <span className="muted" style={{ fontSize: 13 }}>{screening.summary}</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Block title="Sanctions / watchlist" items={screening.sanctions} empty="No sanctions or watchlist hits found." render={(it) => (
              <div style={{ fontSize: 12.5 }}><b>{it.list || "Hit"}</b> — {it.detail} {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)" }}>↗</a>}</div>)} />
            <Block title="Adverse media" items={screening.adverseMedia} empty="No adverse media found." render={(it) => (
              <div style={{ fontSize: 12.5 }}><span className="chip" style={{ background: (SEV[it.sev]?.c || "#888") + "22", color: SEV[it.sev]?.c || "#888", marginRight: 6 }}>{SEV[it.sev]?.t || "Note"}</span>{it.url ? <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)" }}>{it.headline}</a> : it.headline}<div className="muted mono" style={{ fontSize: 10.5, marginTop: 2 }}>{it.source}{it.date ? " · " + it.date : ""}</div></div>)} />
            <Block title="Beneficial owners (found)" items={screening.ubos} empty="No ownership information surfaced." render={(it) => (
              <div style={{ fontSize: 12.5 }}><b>{it.name}</b>{it.detail ? " — " + it.detail : ""}</div>)} />
            <Block title="Managing directors / officers" items={screening.directors} empty="No directors/officers surfaced." render={(it) => (
              <div style={{ fontSize: 12.5 }}><b>{it.name}</b>{it.role ? " — " + it.role : ""}</div>)} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Block title="Customer / market feedback" items={screening.feedback} empty="No notable feedback found." render={(it) => (
                <div style={{ fontSize: 12.5 }}><span className="chip" style={{ background: (it.sentiment === "negative" ? "var(--red)" : it.sentiment === "positive" ? "var(--green)" : "var(--muted)") + "22", color: it.sentiment === "negative" ? "var(--red)" : it.sentiment === "positive" ? "var(--green)" : "var(--muted)", marginRight: 6 }}>{it.sentiment || "mixed"}</span>{it.url ? <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)" }}>{it.summary}</a> : it.summary}<span className="muted mono" style={{ fontSize: 10.5 }}>{it.source ? " · " + it.source : ""}</span></div>)} />
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>Screening results are AI-assisted leads from open sources — verify before acting (trust, and verify).</div>
        </>
      )}
    </div>
  );
}

/* ---- Due-diligence file: partner-provided intake + Mal verification + checklist ---- */
function DDRow({ label, v }) { return <div className="row" style={{ justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--line)", gap: 12 }}><span className="muted" style={{ fontSize: 12.5 }}>{label}</span><span style={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}>{v == null || v === "" ? "—" : String(v)}</span></div>; }
function DDView({ slice, base, screening, onScreen, screenLoading, supervisor = true }) {
  const ob = slice.onboarding;
  const tier = base.riskTier || suggestTier(base.category, base.jur);
  return (
    <>
      {supervisor && <div className="card" style={{ marginBottom: 13 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div><b style={{ fontSize: 15 }}>{base.name}</b> <span className="muted">· {base.category} · {base.jur}</span></div>
          <div className="row" style={{ gap: 8 }}>
            <span className="chip" style={{ background: "var(--brand50)", color: "var(--brand600)" }}>{tier}</span>
            <span className="chip" style={{ background: "#f5f6fb" }}>{slice.lifecycle || base.lifecycle || "Stage 3 — Verification & DD"}</span>
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{TIER_NOTE[tier]}</div>
      </div>}

      {/* Automatic screening — Mal's independent verification (Stage 3), supervisor-only */}
      {supervisor && <ScreeningPanel partnerId={base.id} base={base} screening={screening} onRun={onScreen} loading={screenLoading} />}

      {/* Reputational & financial-crime red-flag review (supervisor-only) */}
      {supervisor && (() => {
        const sc = screening || {}; const ob2 = ob || {};
        const sanctionsHit = (sc.sanctions || []).length > 0;
        const adverseHit = (sc.adverseMedia || []).some(m => m.sev === "crit" || m.sev === "high");
        const opaque = !(ob2.ubos && ob2.ubos.length) && !(sc.ubos && sc.ubos.length);
        const flags = [
          { k: "Sanctions / watchlist nexus", flag: sanctionsHit, basis: sanctionsHit ? (sc.sanctions.length + " screening hit(s)") : "No screening hits", sev: "Critical" },
          { k: "Adverse media (fraud, ML, enforcement)", flag: adverseHit, basis: adverseHit ? "High-severity item(s) found" : "Nothing high-severity found", sev: "High" },
          { k: "PEP exposure (ownership / control)", flag: ob2.pep === "Y", basis: ob2.pep === "Y" ? "Declared PEP — establish SoW/SoF" : "None declared", sev: "High" },
          { k: "Prior enforcement / litigation", flag: ob2.priorIssues === "Y", basis: ob2.priorIssues === "Y" ? (ob2.priorNotes || "Declared — review detail") : "None declared", sev: "High" },
          { k: "Opaque / unverified ownership", flag: opaque, basis: opaque ? "No UBO established yet — verify before go-live" : "Owners on file", sev: "High" },
          { k: "High-risk corridor exposure", flag: HIGH_CORRIDORS.includes(base.jur), basis: HIGH_CORRIDORS.includes(base.jur) ? base.jur + " — corridor override applies" : "Standard corridor", sev: "Medium" },
        ];
        const open = flags.filter(f => f.flag).length;
        return (
          <div className="card" style={{ marginBottom: 13, borderColor: open ? "var(--red)" : "var(--line)" }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ margin: 0 }}><AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: open ? "var(--red)" : "var(--muted)" }} />Reputational & financial-crime red-flag review</h3>
              <span className="chip" style={{ background: (open ? "var(--red)" : "var(--green)") + "22", color: open ? "var(--red)" : "var(--green)" }}>{open ? open + " flag(s) to clear" : "No open red flags"}</span>
            </div>
            <div className="muted" style={{ fontSize: 11.5, margin: "6px 0 10px" }}>Synthesises the partner's declarations and Mal's screening into the financial-crime / reputational lens. Flags are leads for human judgment — clear or remediate before approval.</div>
            {(() => { const baseSc = overall(base); const adj = effScore(base, slice); const r0 = ratingFor(baseSc), r1 = ratingFor(adj); return (
              <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: 12 }}>Compliance score</span><b style={{ fontSize: 13 }}>{baseSc}</b><span className="muted">→</span>
                <b style={{ fontSize: 14, color: r1.c }}>{adj}</b>
                <span className="chip" style={{ background: r1.c + "22", color: r1.c }}>adverse-media adjusted · {r1.t}</span>
                {adj !== baseSc && <span className="muted" style={{ fontSize: 11 }}>screening lowered it from {r0.t} ({baseSc})</span>}
              </div>
            ); })()}
            {flags.map((f, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", gap: 10 }}>
                <span style={{ fontSize: 12.5 }}><b>{f.k}</b><div className="muted" style={{ fontSize: 11.5 }}>{f.basis}</div></span>
                <span className="chip" style={{ background: (f.flag ? (SEV[f.sev === "Critical" ? "crit" : f.sev === "High" ? "high" : "med"].c) : "var(--green)") + "22", color: f.flag ? (SEV[f.sev === "Critical" ? "crit" : f.sev === "High" ? "high" : "med"].c) : "var(--green)", whiteSpace: "nowrap" }}>{f.flag ? "Flag · " + f.sev : "Clear"}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Partner-provided intake (minimum data) */}
      <div className="card" style={{ marginBottom: 13 }}><h3>{supervisor ? "Partner-provided intake (minimum data)" : "Your submitted details"}</h3>
        {ob ? (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div><DDRow label="Legal entity" v={ob.entityName} /><DDRow label="Country" v={ob.country} /><DDRow label="Reg. number" v={ob.regNumber} /><DDRow label="Website" v={ob.website} /></div>
            <div><DDRow label="Markets / corridors" v={ob.jurisdictions} /><DDRow label="Regulator" v={ob.regulator} /><DDRow label="Licence no." v={ob.licenceNumber} /><DDRow label="Contact" v={ob.coName ? ob.coName + " · " + (ob.coEmail || "") : ""} /></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", margin: "8px 0 4px" }}>Declared owners / directors (to be verified)</div>
              {(ob.ubos && ob.ubos.length) ? <div className="tablewrap"><table><thead><tr><th>Name</th><th>Role / %</th><th>Nationality</th></tr></thead><tbody>{ob.ubos.map((u, i) => <tr key={i}><td>{u.name}</td><td>{u.role}</td><td>{u.nationality}</td></tr>)}</tbody></table></div> : <div className="muted" style={{ fontSize: 12.5 }}>None declared.</div>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", margin: "10px 0 4px" }}>Self-declarations</div>
              <DDRow label="PEP among owners / directors" v={ob.pep} /><DDRow label="Past regulatory action / enforcement / litigation" v={ob.priorIssues} />
              {ob.priorNotes && <DDRow label="Partner note" v={ob.priorNotes} />}{ob.artefacts && <DDRow label="Existing artefacts supplied" v={ob.artefacts} />}
              <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", margin: "12px 0 4px" }}>Alignment & shared commitments</div>
              <DDRow label="Not sanctioned / screens against lists" v={ob.sanctionsAttest} /><DDRow label="Maintains AML/CFT programme" v={ob.amlAttest} /><DDRow label="Will notify Mal of material changes" v={ob.notifyAttest} /><DDRow label="Authorises Mal verification & screening" v={ob.consent} />
              {base.category === "Payout partners" && <DDRow label="No hawala / hundi / IVTS settlement" v={ob.ivtsAttest} />}
            </div>
          </div>
        ) : <div className="muted" style={{ fontSize: 13 }}>No intake captured for this partner. Run an onboarding intake to record the partner-provided minimum.</div>}
      </div>

      {/* Mal-conducted verification checklist (Stage 3) */}
      <div className="card"><h3>{supervisor ? "Mal verification checklist (we conduct the deep DD)" : "Your documents"}</h3>
        <div className="tablewrap"><table><thead><tr><th>Item</th><th>Status</th></tr></thead>
          <tbody>{DD_ITEMS.map(d => <tr key={d.id}><td style={{ fontWeight: 600 }}>{d.label}</td><td><span className="chip" style={{ background: slice.dd[d.id] === "Complete" ? "rgba(23,163,74,.14)" : "rgba(245,158,11,.16)", color: slice.dd[d.id] === "Complete" ? "var(--green)" : "var(--amber)" }}>{slice.dd[d.id]}</span></td></tr>)}</tbody>
        </table></div>
      </div>
    </>
  );
}

/* ============================================================================
   OBLIGATIONS & SLA — agreements converted into two-sided alerts + reminders
   owner "Mal" = what Mal must provide; owner "Partner" = what the partner owes.
============================================================================ */
function _plusDays(n) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString(); }
function _nextMonthly(day) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1, day || 1); return d.toISOString(); }
function _nextQuarterEnd() { const d = new Date(); const q = Math.floor(d.getMonth() / 3); const e = new Date(d.getFullYear(), q * 3 + 3, 0); e.setHours(0, 0, 0, 0); return e.toISOString(); }
function _nextAnnual(monthIdx, day) { const d = new Date(); const c = new Date(d.getFullYear(), monthIdx, day); c.setHours(0, 0, 0, 0); if (c < d) c.setFullYear(d.getFullYear() + 1); return c.toISOString(); }
function dueIn(iso) { if (!iso) return null; return Math.ceil((new Date(iso) - new Date()) / 864e5); }
function obReminder(ob) {
  if (ob.due) { const n = dueIn(ob.due); const st = n < 0 ? "Overdue" : n <= 7 ? "Due soon" : "Scheduled"; const c = n < 0 ? "var(--red)" : n <= 7 ? "var(--amber)" : "var(--green)"; return { label: st + (n < 0 ? ` · ${Math.abs(n)}d overdue` : n === 0 ? " · today" : ` · in ${n}d`), c, when: fmtDate(ob.due) }; }
  if (ob.kind === "event") return { label: "Event-driven", c: "var(--info)", when: "On trigger" };
  if (ob.kind === "pending") return { label: "Pending sign-off", c: "var(--amber)", when: "Before go-live" };
  return { label: "Ongoing", c: "var(--muted)", when: "Continuous" };
}

const OBLIGATIONS = [
  /* ---------------- ZENUS — Program Services / FBO Agreement ---------------- */
  { id: "z1", partner: "zenus", owner: "Mal", title: "Fund the FBO Account daily", detail: "Maintain ≥ greater of $50,000 Minimum Balance or the 5-day trailing average; if below Required Balance, fund within 3 business days.", clause: "Art. 6 / Minimum Balance", cadence: "Every business day", sla: "Daily · cure 3 BD", sev: "crit", kind: "recurring", due: _plusDays(1) },
  { id: "z2", partner: "zenus", owner: "Mal", title: "Daily reconciliation of Deposit Ledger vs FBO Account", detail: "Reconcile balances and confirm every transaction has a corresponding End-User authorization.", clause: "Sch. 3.7", cadence: "Every business day", sla: "Daily", sev: "high", kind: "recurring", due: _plusDays(1) },
  { id: "z3", partner: "zenus", owner: "Mal", title: "Report suspicious activity to Zenus", detail: "Immediate notice of suspicious activity identified by the Program Manager.", clause: "Sch. 3.7(e)", cadence: "On detection", sla: "Immediately", sev: "crit", kind: "event", due: null },
  { id: "z4", partner: "zenus", owner: "Mal", title: "Notify Zenus of legal actions / subpoenas / levies", detail: "Subpoenas, levies, information requests and garnishments — no later than 10 business days of receipt (drafting note: clause reads ‘three (10)’).", clause: "Sch. 3.7(e)", cadence: "On receipt", sla: "≤ 10 business days", sev: "high", kind: "event", due: null },
  { id: "z5", partner: "zenus", owner: "Mal", title: "Deliver third-party / Network notices", detail: "Provide copies of notices received from any Network or third party relating to the program within 20 business days.", clause: "Art. 3", cadence: "On receipt", sla: "≤ 20 business days", sev: "med", kind: "event", due: null },
  { id: "z6", partner: "zenus", owner: "Mal", title: "Quarterly complaint trend analysis", detail: "Analyse all complaints including a trend analysis and report to Zenus.", clause: "§4.4", cadence: "Quarterly", sla: "Each quarter", sev: "med", kind: "recurring", due: _nextQuarterEnd() },
  { id: "z7", partner: "zenus", owner: "Mal", title: "Quarterly list of new/terminated service providers", detail: "Provide the list of new and terminated Third-Party Service Providers participating in the program.", clause: "Sch. 3.7(e)", cadence: "Quarterly", sla: "Each quarter", sev: "low", kind: "recurring", due: _nextQuarterEnd() },
  { id: "z8", partner: "zenus", owner: "Mal", title: "Annual policy review & independent compliance test", detail: "Review and test compliance policies at least annually; policies approved annually by both parties.", clause: "Sch. 4.1(a)", cadence: "Annual", sla: "Every 12 months", sev: "high", kind: "recurring", due: _nextAnnual(11, 31) },
  { id: "z9", partner: "zenus", owner: "Mal", title: "Independent AML/BSA audit", detail: "Independent AML test within 12 months of launch, by someone other than the CO, reported to the Board (gap: add to Schedule 3.6(a)).", clause: "Gap item 4 / Annex 1", cadence: "Annual", sla: "Within 12 months of launch", sev: "high", kind: "recurring", due: _nextAnnual(2, 31) },
  { id: "z10", partner: "zenus", owner: "Mal", title: "Deliver audited financial statements", detail: "Audited consolidated financial statements within 180 days after each fiscal year-end.", clause: "§3.6(c)", cadence: "Annual", sla: "≤ 180 days after FY-end", sev: "med", kind: "deadline", due: _nextAnnual(5, 29) },
  { id: "z11", partner: "zenus", owner: "Mal", title: "Maintain OFAC SDN screening & 5-year records", detail: "Screen applicants at onboarding and on each SDN update; never open accounts for sanctioned persons; retain End-User & transaction records 5 years.", clause: "Sch. 4.1(a)", cadence: "Continuous", sla: "On each SDN publication", sev: "crit", kind: "ongoing", due: null },
  { id: "z12", partner: "zenus", owner: "Mal", title: "Non-renewal notice window", detail: "If electing not to renew, give ≥ 90 days written notice before the end of the 36-month initial term (29 May 2029).", clause: "§12.1", cadence: "One-time", sla: "≥ 90 days before term end", sev: "low", kind: "deadline", due: "2029-02-28" },
  { id: "z20", partner: "zenus", owner: "Partner", title: "Provide read-only FBO access; no commingling", detail: "Zenus gives Mal read-only FBO access, never commingles third-party funds, and moves funds only on Mal’s instruction.", clause: "§7.4", cadence: "Continuous", sla: "Continuous", sev: "high", kind: "ongoing", due: null },
  { id: "z21", partner: "zenus", owner: "Partner", title: "Notice before account adjustments", detail: "Zenus notifies Mal (email/phone) before making adjustments to the FBO / sub-account information.", clause: "§7.3", cadence: "On change", sla: "Prior notice", sev: "med", kind: "event", due: null },
  { id: "z22", partner: "zenus", owner: "Partner", title: "Prompt notice of proceedings affecting Zenus", detail: "Zenus promptly notifies Mal of any material action, suit or regulatory action affecting it.", clause: "§9", cadence: "On event", sla: "Promptly", sev: "med", kind: "event", due: null },
  { id: "z23", partner: "zenus", owner: "Partner", title: "Provide wind-down / transition plan", detail: "At least 30 days prior to expiration/termination, Zenus provides a proposed transition or wind-down plan.", clause: "§13 Wind-Down", cadence: "On exit", sla: "≥ 30 days before exit", sev: "med", kind: "event", due: null },

  /* ---------------- RAIN / SIGNIFY — Card Issuing & Program Mgmt (MSA) ---------------- */
  { id: "r1", partner: "rain", owner: "Mal", title: "Maintain 4× settlement reserve & fund daily", detail: "Hold a reserve of 4× the largest daily settlement in the prior 30 days and top up each day to the minimum; Signify may debit it for losses.", clause: "Sch. 2 — Reserve", cadence: "Every day", sla: "Daily top-up", sev: "crit", kind: "recurring", due: _plusDays(1) },
  { id: "r2", partner: "rain", owner: "Mal", title: "Sponsor gas / daily settlement", detail: "Maintain self-custodial wallet token balance to sponsor gas; settlement runs daily.", clause: "Sch. 2 — Settlement", cadence: "Every day", sla: "Daily", sev: "high", kind: "recurring", due: _plusDays(1) },
  { id: "r3", partner: "rain", owner: "Mal", title: "Pay Signify invoices", detail: "Pay monthly invoices no later than 30 days after receipt; late amounts accrue 1.5%/month interest.", clause: "Invoicing", cadence: "Monthly", sla: "≤ 30 days from invoice", sev: "med", kind: "recurring", due: _nextMonthly(1) },
  { id: "r4", partner: "rain", owner: "Mal", title: "Bear 100% of program losses", detail: "Partner is responsible for all provisional credits, fraud, chargebacks, force posts, negative-balance write-offs, insufficient funds and disputes.", clause: "Sch. 2 — Program Losses", cadence: "Continuous", sla: "Continuous", sev: "crit", kind: "ongoing", due: null },
  { id: "r5", partner: "rain", owner: "Mal", title: "Provide onboarding & go-live documents", detail: "Formation docs, shareholder register, UBO IDs, source of funds, AML/CTF docs, flow of funds, org chart, proof of insurance, recent compliance audit.", clause: "Partner Documentary Review", cadence: "One-time", sla: "Before go-live", sev: "high", kind: "pending", due: null },
  { id: "r20", partner: "rain", owner: "Partner", title: "Name the issuing depository bank", detail: "Identify the issuing bank in the MSA and attach a tripartite BSA/AML responsibility-allocation matrix (so SAR/CTR filing can be mapped).", clause: "MLRO finding R-1", cadence: "Before signing", sla: "Pre-signature", sev: "crit", kind: "pending", due: null },
  { id: "r21", partner: "rain", owner: "Partner", title: "Carve compliance out of unilateral ToS amendment", detail: "Carve AML, sanctions, Travel Rule and consumer protection out of the unilaterally amendable Schedule 1; require 30-day notice + affirmative consent.", clause: "MLRO finding R-2", cadence: "Before signing", sla: "Pre-signature", sev: "crit", kind: "pending", due: null },
  { id: "r22", partner: "rain", owner: "Partner", title: "Cap fraud liability + real-time controls", detail: "Cap force-post/fraud liability and implement real-time authorization controls rather than shifting 100% loss to Mal.", clause: "MLRO finding R-3", cadence: "Before signing", sla: "Pre-signature", sev: "crit", kind: "pending", due: null },
  { id: "r23", partner: "rain", owner: "Partner", title: "Provide the missing Co-Brand Agreement", detail: "Co-Brand Agreement is referenced as governing the services but was not attached; obtain and review it.", clause: "Schedule 3 / Co-Brand", cadence: "Before signing", sla: "Pre-signature", sev: "high", kind: "pending", due: null },
  { id: "r24", partner: "rain", owner: "Partner", title: "Monthly invoices & interchange settlement", detail: "Signify issues monthly invoices and pays interchange revenue monthly on a gross basis; no markup on actual gas fees.", clause: "Invoicing / Revenue share", cadence: "Monthly", sla: "Each month", sev: "low", kind: "recurring", due: _nextMonthly(5) },

  /* ---------------- OSCILAR — TM/screening (pre-contract gap remediation) ---------------- */
  { id: "o20", partner: "oscilar", owner: "Partner", title: "Deliver integrated OFAC/UN/OFSI screening module", detail: "Sanctions screening with fail-closed suspense quarantine and 10-day blocking-report capability; the library currently has zero OFAC rules.", clause: "Gap O-1 / 31 CFR 501", cadence: "Before go-live", sla: "Pre-go-live", sev: "crit", kind: "pending", due: null },
  { id: "o21", partner: "oscilar", owner: "Partner", title: "Deliver crypto / CVC monitoring rules", detail: "Wallet adjacency, mixer/tumbler exposure, chain-hopping detection and blockchain analytics over the reserve.", clause: "Gap O-2 / FIN-2025-CVC", cadence: "Before go-live", sla: "Pre-go-live", sev: "crit", kind: "pending", due: null },
  { id: "o22", partner: "oscilar", owner: "Partner", title: "Real-time preventive holds for Pakistan corridor", detail: "Real-Time Risk Assessment with minimum dwell time and age-scaled caps — prevention, not just post-transaction detection.", clause: "Gap O-3", cadence: "Before go-live", sla: "Pre-go-live", sev: "crit", kind: "pending", due: null },
  { id: "o23", partner: "oscilar", owner: "Partner", title: "Geographic weighting + MRM tuning", detail: "SBP/provincial corridor weighting, tuning of hardcoded OOTB defaults, and a zero-hit KRI.", clause: "Gap O-4", cadence: "Before go-live", sla: "Pre-go-live", sev: "high", kind: "pending", due: null },
  { id: "o1", partner: "oscilar", owner: "Mal", title: "Independent model validation & tuning", detail: "Validate and tune the monitoring rules; never rely on processor output as CDD (processor governance).", clause: "Doc 0.4 / processor governance", cadence: "Annual", sla: "Every 12 months", sev: "med", kind: "recurring", due: _nextAnnual(8, 30) },
];

function ObCard({ ob }) {
  const r = obReminder(ob);
  return (
    <div className="card" style={{ marginBottom: 9, borderLeft: `3px solid ${SEV[ob.sev].c}` }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13.5 }}>{ob.title}</b>
        <span className="chip" style={{ background: r.c + "22", color: r.c, whiteSpace: "nowrap" }}>{r.label}</span>
      </div>
      <div className="muted" style={{ fontSize: 12.5, margin: "5px 0 8px" }}>{ob.detail}</div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", fontSize: 11 }}>
        <span className="chip" style={{ background: "#f5f6fb" }}>{ob.cadence}</span>
        <span className="chip" style={{ background: "#f5f6fb" }}>SLA: {ob.sla}</span>
        <span className="chip" style={{ background: "#f5f6fb" }}>{ob.clause}</span>
        <span className="chip" style={{ background: SEV[ob.sev].c + "18", color: SEV[ob.sev].c }}>{SEV[ob.sev].t}</span>
        {ob.due && <span className="muted mono" style={{ fontSize: 11 }}>next: {r.when}</span>}
      </div>
    </div>
  );
}

function ObligationsView({ partnerId, base, supervisor }) {
  const mine = OBLIGATIONS.filter(o => o.partner === partnerId);
  const malSide = mine.filter(o => o.owner === "Mal");
  const partnerSide = mine.filter(o => o.owner === "Partner");
  const urgent = mine.filter(o => o.due && dueIn(o.due) <= 7);
  const overdue = mine.filter(o => o.due && dueIn(o.due) < 0);
  if (mine.length === 0) return <><h1 className="h1">Obligations & SLA</h1><p className="sub">No agreement obligations recorded for this partner yet. They are created from the executed agreement.</p></>;
  return (
    <>
      <h1 className="h1">Obligations & SLA</h1>
      <p className="sub">Every commitment in the agreement, as a live alert — split by who owes it — so the SLA is met on both sides. {overdue.length > 0 ? <b style={{ color: "var(--red)" }}>{overdue.length} overdue.</b> : null} {urgent.length > 0 ? <b style={{ color: "var(--amber)" }}>{urgent.length} due within 7 days.</b> : null}</p>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}><span className="catdot" style={{ background: "var(--brand600)" }} /><b style={{ fontSize: 14 }}>{supervisor ? "Mal must provide" : "What we (Mal) provide to you"}</b><span className="chip" style={{ background: "#f5f6fb" }}>{malSide.length}</span></div>
          {malSide.map(o => <ObCard key={o.id} ob={o} />)}
        </div>
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}><span className="catdot" style={{ background: "var(--info)" }} /><b style={{ fontSize: 14 }}>{supervisor ? `${base.name} must provide` : "Your obligations to Mal"}</b><span className="chip" style={{ background: "#f5f6fb" }}>{partnerSide.length}</span></div>
          {partnerSide.map(o => <ObCard key={o.id} ob={o} />)}
        </div>
      </div>
    </>
  );
}

function ObligationsRollup({ store, agents, viewProfile }) {
  const rows = agents.map(({ base }) => {
    const mine = OBLIGATIONS.filter(o => o.partner === base.id);
    const overdue = mine.filter(o => o.due && dueIn(o.due) < 0).length;
    const soon = mine.filter(o => o.due && dueIn(o.due) >= 0 && dueIn(o.due) <= 7).length;
    return { base, total: mine.length, mal: mine.filter(o => o.owner === "Mal").length, partner: mine.filter(o => o.owner === "Partner").length, overdue, soon };
  }).filter(r => r.total > 0);
  const allAlerts = OBLIGATIONS.filter(o => o.due && dueIn(o.due) <= 7).sort((a, b) => dueIn(a.due) - dueIn(b.due));
  const nameOf = (id) => (agents.find(a => a.base.id === id) || {}).base?.name || id;
  return (
    <>
      <h1 className="h1">Obligations & SLA</h1>
      <p className="sub">Agreement commitments across every partner, as two-sided alerts and reminders — what Mal owes, and what each partner owes — so service levels are kept on both sides.</p>
      <div className="row" style={{ gap: 11, marginBottom: 14, flexWrap: "wrap" }}>
        <Kpi label="Tracked obligations" value={OBLIGATIONS.length} />
        <Kpi label="Mal-owed" value={OBLIGATIONS.filter(o => o.owner === "Mal").length} />
        <Kpi label="Partner-owed" value={OBLIGATIONS.filter(o => o.owner === "Partner").length} />
        <Kpi label="Overdue" value={OBLIGATIONS.filter(o => o.due && dueIn(o.due) < 0).length} />
        <Kpi label="Due ≤ 7 days" value={allAlerts.filter(o => dueIn(o.due) >= 0).length} />
      </div>
      <div className="card" style={{ marginBottom: 14 }}><h3>Upcoming & overdue reminders</h3>
        {allAlerts.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>Nothing due in the next 7 days.</div> :
          <div className="tablewrap"><table><thead><tr><th>When</th><th>Partner</th><th>Owner</th><th>Obligation</th><th>SLA</th></tr></thead>
            <tbody>{allAlerts.map(o => { const r = obReminder(o); return (
              <tr key={o.id}><td><span className="chip" style={{ background: r.c + "22", color: r.c, whiteSpace: "nowrap" }}>{r.label}</span></td><td style={{ fontWeight: 600 }}>{nameOf(o.partner)}</td><td><span className="chip" style={{ background: o.owner === "Mal" ? "var(--brand50)" : "rgba(30,99,233,.12)", color: o.owner === "Mal" ? "var(--brand600)" : "var(--info)" }}>{o.owner === "Mal" ? "Mal" : "Partner"}</span></td><td>{o.title}</td><td className="muted" style={{ fontSize: 12 }}>{o.sla}</td></tr>
            ); })}</tbody>
          </table></div>}
      </div>
      <div className="card"><h3>By partner</h3>
        <div className="tablewrap"><table><thead><tr><th>Partner</th><th>Total</th><th>Mal-owed</th><th>Partner-owed</th><th>Overdue</th><th>Due ≤ 7d</th><th></th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.base.id}><td style={{ fontWeight: 700 }}>{r.base.name}</td><td>{r.total}</td><td>{r.mal}</td><td>{r.partner}</td><td>{r.overdue > 0 ? <span className="chip" style={{ background: "rgba(239,68,68,.14)", color: "var(--red)" }}>{r.overdue}</span> : "0"}</td><td>{r.soon > 0 ? <span className="chip" style={{ background: "rgba(245,158,11,.16)", color: "var(--amber)" }}>{r.soon}</span> : "0"}</td><td><button className="btn ghost" onClick={() => viewProfile(r.base.id)}>Open <ChevronRight size={13} /></button></td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  );
}

/* ============================================================================
   PRODUCT LIFECYCLE — lightweight in-platform slideshow
   A compact, native recreation of the "Mal Kitchen Guide" deck: how the
   fund-flow lifecycle works and how each partner plugs in. No heavy images —
   built from the deck's story as styled brand cards. Auto-plays with controls.
============================================================================ */
const LC_HELPERS = [
  { emoji: "👵", name: "Mal", role: "Orchestrator", note: "Grandma running the kitchen", c: "var(--gold)" },
  { emoji: "🧢", name: "Zenus", role: "Banking rails", note: "the Mailman who moves the money", c: "var(--blue)" },
  { emoji: "👓", name: "Oscilar", role: "Risk engine", note: "the thick reading Glasses", c: "var(--violet)" },
  { emoji: "📕", name: "SaaScada", role: "Core ledger", note: "the big Accounting Book", c: "#0ea5e9" },
];
const LC_BUCKETS = [
  { emoji: "📦", name: "Nostro", meta: "Front Porch", note: "Operational funds land here" },
  { emoji: "🗄️", name: "Suspense", meta: "Hallway Table", note: "Transit & quarantine — checked before release" },
  { emoji: "👛", name: "User account", meta: "Piggy Bank", note: "End-user liability — their money" },
];
const LC_FLOW = ["Nostro", "Suspense", "Risk review", "User"];
const LC_FLOW_EMOJI = ["📦", "🗄️", "👓", "👛"];
const LC_GLOSSARY = [
  ["Grandma / Mal", "Orchestrator"],
  ["Mailman", "Zenus — banking rails"],
  ["Thick glasses", "Oscilar — risk engine"],
  ["Accounting book", "SaaScada — core ledger"],
  ["Front porch", "Nostro account"],
  ["Hallway table", "Suspense account"],
  ["Piggy bank", "End-user liability account"],
];
const LC_SLIDES = [
  { tag: "System_Init_Ready", kind: "intro", title: "The Kitchen Guide" },
  { tag: "Meet the helpers", kind: "helpers", title: "Meet the helpers" },
  { tag: "Where the money sits", kind: "buckets", title: "The three buckets" },
  { tag: "The golden house rule", kind: "flow", title: "The golden rule" },
  { tag: "Metaphor → system", kind: "glossary", title: "Kitchen glossary" },
  { tag: "The connection, at a glance", kind: "recap", title: "How it all connects" },
];
const lcCard = { background: "#fff", border: "1px solid #e9dcc6", borderRadius: 14, padding: "14px 12px", textAlign: "center" };
function SlideHead({ title, note }) {
  return <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.01em" }}>{title}</div>
    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{note}</div>
  </div>;
}
function LifecycleShow() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [pulse, setPulse] = useState(0);
  const N = LC_SLIDES.length;
  useEffect(() => { if (!playing) return; const t = setTimeout(() => setI(x => (x + 1) % N), 5600); return () => clearTimeout(t); }, [i, playing, N]);
  useEffect(() => { const t = setInterval(() => setPulse(p => (p + 1) % 4), 900); return () => clearInterval(t); }, []);
  const s = LC_SLIDES[i];
  const go = (d) => setI(x => (x + d + N) % N);
  const stage = {
    position: "relative", borderRadius: 22, padding: "30px 28px 26px", minHeight: 392, overflow: "hidden",
    background: "linear-gradient(135deg,#fbf5ea 0%,#f4ecdf 58%,#efe7f6 100%)", border: "1px solid #e9dcc6",
    boxShadow: "inset 0 1px 0 #fff, 0 12px 32px -18px rgba(120,80,30,.35)",
  };
  return (
    <>
      <h1 className="h1">Product lifecycle</h1>
      <p className="sub">A 60-second tour of how Mal works — the fund-flow lifecycle and how each partner plugs in, told as a warm kitchen story. It plays on its own; use the controls to explore.</p>

      <div style={stage}>
        <div style={{ position: "absolute", top: 15, right: 16 }}>
          <span className="chip mono" style={{ background: "#fff", border: "1px solid #e9dcc6", color: "var(--brand600)" }}>{s.tag}</span>
        </div>

        {s.kind === "intro" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 330 }}>
            <div style={{ fontSize: 52 }}>{"🍵"}</div>
            <span className="chip" style={{ background: "var(--brand50)", color: "var(--brand600)", marginTop: 12, letterSpacing: ".5px" }}>MAL · GLOBAL ACCOUNTS</span>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-.02em", margin: "12px 0 6px" }}>The Kitchen Guide</div>
            <div className="muted" style={{ fontSize: 14, maxWidth: 520 }}>How Mal works with its partners — the product lifecycle, explained over a cup of tea.</div>
            <div className="row" style={{ gap: 8, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
              {["Mal", "Zenus", "Oscilar", "SaaScada", "Rain"].map(x => <span key={x} className="chip" style={{ background: "#fff", border: "1px solid #e9dcc6" }}>{x}</span>)}
            </div>
          </div>
        )}

        {s.kind === "helpers" && (
          <div>
            <SlideHead title="Meet the helpers" note="Four hands keep the kitchen running — each maps to a real system." />
            <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 16 }}>
              {LC_HELPERS.map(h => (
                <div key={h.name} style={lcCard}>
                  <div style={{ fontSize: 36 }}>{h.emoji}</div>
                  <div style={{ fontWeight: 800, marginTop: 6 }}>{h.name}</div>
                  <div className="chip" style={{ background: h.c + "1e", color: h.c, marginTop: 5 }}>{h.role}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{h.note}</div>
                </div>
              ))}
            </div>
            <div className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 16 }}>Clear separation of duties — orchestration, execution, risk screening and system of record.</div>
          </div>
        )}

        {s.kind === "buckets" && (
          <div>
            <SlideHead title="The three buckets — where money sits" note="Funds are never thrown straight into a wallet. They rest in three places." />
            <div className="row" style={{ gap: 10, marginTop: 26, justifyContent: "center", flexWrap: "wrap" }}>
              {LC_BUCKETS.map((b, k) => (
                <React.Fragment key={b.name}>
                  <div style={{ ...lcCard, width: 196 }}>
                    <div style={{ fontSize: 38 }}>{b.emoji}</div>
                    <div style={{ fontWeight: 800, marginTop: 6 }}>{b.name}</div>
                    <div className="muted" style={{ fontSize: 11.5, fontStyle: "italic" }}>{"“" + b.meta + "”"}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{b.note}</div>
                  </div>
                  {k < LC_BUCKETS.length - 1 && <div style={{ fontSize: 26, color: "var(--gold)", fontWeight: 700 }}>{"→"}</div>}
                </React.Fragment>
              ))}
            </div>
            <div className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 22 }}>Strict segregation of operational funds, transit / quarantine funds, and user liabilities.</div>
          </div>
        )}

        {s.kind === "flow" && (
          <div>
            <SlideHead title="The golden house rule" note="Money always moves one way — and never skips a step." />
            <div className="row" style={{ gap: 4, marginTop: 30, justifyContent: "center", flexWrap: "wrap" }}>
              {LC_FLOW.map((node, k) => (
                <React.Fragment key={node}>
                  <div style={{ padding: "14px 16px", borderRadius: 14, border: "2px solid", borderColor: pulse === k ? "var(--gold)" : "#e9dcc6", background: pulse === k ? "var(--brand50)" : "#fff", transition: ".35s", textAlign: "center", minWidth: 104 }}>
                    <div style={{ fontSize: 22 }}>{LC_FLOW_EMOJI[k]}</div>
                    <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4, color: pulse === k ? "var(--brand600)" : "var(--text)" }}>{node}</div>
                  </div>
                  {k < LC_FLOW.length - 1 && <div style={{ fontSize: 22, color: pulse === k ? "var(--gold)" : "#cdbb9c", transition: ".35s", padding: "0 2px" }}>{"→"}</div>}
                </React.Fragment>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 26 }}>
              <span className="chip" style={{ background: "var(--red)", color: "#fff", fontWeight: 800, letterSpacing: ".6px" }}>NO EXCEPTIONS</span>
            </div>
            <div className="muted" style={{ textAlign: "center", fontSize: 12.5, marginTop: 12, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>The risk gate (Oscilar) sits before the user — funds can’t reach a customer without passing the safety check first.</div>
          </div>
        )}

        {s.kind === "glossary" && (
          <div>
            <SlideHead title="Kitchen glossary — metaphor to system" note="The cheat sheet that ties the story to the real architecture." />
            <div style={{ ...lcCard, padding: 0, marginTop: 16, textAlign: "left", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
              {LC_GLOSSARY.map(([a, b], k) => (
                <div key={a} className="row" style={{ justifyContent: "space-between", padding: "9px 16px", borderBottom: k < LC_GLOSSARY.length - 1 ? "1px solid #efe6d6" : "none" }}>
                  <span style={{ fontSize: 13 }}>{"🍳  " + a}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand600)" }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {s.kind === "recap" && (
          <div>
            <SlideHead title="The connection, at a glance" note="Every partner has one clear job — and money flows safely between them." />
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
              {LC_HELPERS.map(h => (
                <div key={h.name} className="row" style={{ gap: 10, background: "#fff", border: "1px solid #e9dcc6", borderRadius: 12, padding: "10px 12px" }}>
                  <span style={{ fontSize: 22 }}>{h.emoji}</span>
                  <div><b style={{ fontSize: 13 }}>{h.name}</b> <span className="chip" style={{ background: h.c + "1e", color: h.c }}>{h.role}</span>
                    <div className="muted" style={{ fontSize: 11.5 }}>{h.note}</div></div>
                </div>
              ))}
            </div>
            <div style={{ ...lcCard, marginTop: 12 }}>
              <b style={{ fontSize: 13.5 }}>Nostro {"→"} Suspense {"→"} Risk review {"→"} User</b>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Front Porch {"→"} Hallway Table {"→"} safety check {"→"} Piggy Bank · we never skip a step.</div>
            </div>
          </div>
        )}

        <div key={i} style={{ position: "absolute", left: 0, bottom: 0, height: 4, background: "var(--gold)", width: 0, animation: playing ? "lcfill 5.6s linear forwards" : "none" }} />
      </div>

      <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button className="btn ghost" onClick={() => go(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
        <button className="btn gold" onClick={() => setPlaying(p => !p)}>{playing ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Play</>}</button>
        <button className="btn ghost" onClick={() => go(1)} aria-label="Next"><ChevronRight size={16} /></button>
        <div className="row" style={{ gap: 6, marginLeft: 8 }}>
          {LC_SLIDES.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={"Go to slide " + (k + 1)} style={{ width: k === i ? 22 : 9, height: 9, borderRadius: 99, border: "none", cursor: "pointer", background: k === i ? "var(--gold)" : "#cdbfd6", transition: ".2s", padding: 0 }} />)}
        </div>
        <span className="muted mono" style={{ fontSize: 11, marginLeft: 8 }}>{String(i + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}</span>
      </div>
      <div className="muted" style={{ textAlign: "center", fontSize: 11.5, marginTop: 8 }}>A narrated 19-slide version is available as a downloadable video (GIF / MP4).</div>
    </>
  );
}

const AML_FRAMEWORK = {"name":"Mal AML/CFT Policy Examiner — Authoritative Assessment Framework","version":"1.0","basis":"Derived from Mal Money Inc. AML/CFT policy set: Governance & Regulatory Perimeter Memo (Doc 0.1 / uploaded scanned memorandum); AML/BSA Compliance Programme (1.2); CDD (1.3); Sanctions/OFAC (1.4) & SCP v1.1; Transaction Monitoring (1.5); Travel Rule & Recordkeeping (1.6); SAR/CTR (1.7); PEP (1.8); Record Retention (1.9); MLRO Mandate (2.1); Independent Testing (2.3); Vendor Oversight (0.4); CRAM-01 risk methodology.","riskWeights":{"Critical":3,"High":2,"Medium":1.5,"Low":1},"domains":[{"id":"REG","name":"Regulatory perimeter & licensing","color":"#6a00d6"},{"id":"GOV","name":"Governance & oversight","color":"#8000ff"},{"id":"RA","name":"Risk assessment","color":"#7c3aed"},{"id":"CDD","name":"Customer due diligence","color":"#1e63e9"},{"id":"EDD","name":"Enhanced due diligence","color":"#2563eb"},{"id":"OM","name":"Ongoing monitoring & review","color":"#0ea5e9"},{"id":"TM","name":"Transaction monitoring","color":"#0891b2"},{"id":"SANC","name":"Sanctions screening","color":"#dc2626"},{"id":"PEP","name":"PEP controls","color":"#db2777"},{"id":"SAR","name":"Suspicious activity reporting","color":"#b91c1c"},{"id":"REP","name":"Mandatory reporting (CTR/Travel)","color":"#9333ea"},{"id":"REC","name":"Record retention","color":"#0d9488"},{"id":"TRN","name":"Training & awareness","color":"#16a34a"},{"id":"AUD","name":"Independent audit","color":"#ca8a04"},{"id":"TPO","name":"Third-party & agent oversight","color":"#ea580c"},{"id":"DOB","name":"Digital onboarding","color":"#4f46e5"},{"id":"ESC","name":"Escalation & reporting","color":"#e11d48"}],"controls":[{"id":"REG-1","domain":"REG","requirement":"Registered money-services / transmitter status with a documented regulatory perimeter","expected":"Entity is registered with FinCEN as an MSB (or local equivalent) and maintains a documented activity-classification / regulatory-perimeter analysis covering each leg of the funds flow.","citation":"Mal Doc 0.1 (Regulatory Perimeter Memo); Doc 1.2 §2; 31 CFR 1022.380","risk":"High","keywords":["msb","fincen","money transmitter","registration","perimeter","licensed","registered"],"remediation":"Register with FinCEN (or confirm exemption with counsel) and produce a written perimeter memo classifying each activity and money-transmission leg.","suggestedWording":"The Company is registered with FinCEN as a money services business and maintains a documented regulatory-perimeter analysis, reviewed by counsel, classifying each activity across the funds flow.","complexity":"Medium"},{"id":"REG-2","domain":"REG","requirement":"Filing-institution responsibility is determined and documented","expected":"SAR, CTR and OFAC-report filing responsibility is explicitly allocated (files directly / banking-partner files / split), with an escalation package and SLA where a partner files.","citation":"Mal Doc 1.2 §2.2; Doc 1.7","risk":"High","keywords":["filing institution","files directly","banking partner","allocation","escalation package","responsible for"],"remediation":"Document, with counsel and each partner, which institution files SARs/CTRs/OFAC reports for every leg; where the partner files, define a complete escalation package and timeline.","suggestedWording":"Filing-institution responsibility for SAR, CTR and OFAC reports is documented for each leg; where a partner is the filer the Company transmits a complete escalation package within 20 days of detection.","complexity":"Medium"},{"id":"REG-3","domain":"REG","requirement":"Stricter-standard / standards-hierarchy rule","expected":"Where any partner agreement, scheme rule or law imposes a stricter standard, the stricter standard governs.","citation":"Mal Doc 1.2 §1.3","risk":"Medium","keywords":["stricter standard","applicable law","scheme rule","governs","prevails"],"remediation":"Add an explicit clause that the stricter of policy, partner, scheme or legal requirements always applies.","suggestedWording":"Where any law, regulation, partner agreement or scheme rule imposes a stricter requirement than this policy, the stricter requirement applies.","complexity":"Low"},{"id":"GOV-1","domain":"GOV","requirement":"Board approval and active oversight","expected":"The Board approves the AML programme and material changes at least annually, receives a quarterly compliance dashboard and an annual programme-effectiveness report, and commissions the independent audit.","citation":"Mal Doc 1.2 §5.1","risk":"Critical","keywords":["board","approv","quarterly","annual report","effectiveness","oversight","senior management"],"remediation":"Establish Board approval of the programme (≥annual), a quarterly compliance dashboard, an annual effectiveness report and Board commissioning of the audit.","suggestedWording":"The Board approves this programme at least annually, receives a quarterly compliance dashboard and an annual programme-effectiveness report, and commissions the independent audit.","complexity":"Low"},{"id":"GOV-2","domain":"GOV","requirement":"Designated compliance officer with independence and authority","expected":"A named, qualified AML/BSA compliance officer (MLRO) is designated, reports independently to the Board, is not compensated on revenue, and can be removed only by the Board.","citation":"Mal Doc 1.2 §5.2; 31 CFR 1022.210","risk":"Critical","keywords":["compliance officer","mlro","designated","independent","authority","reports to the board","appointed"],"remediation":"Appoint a qualified compliance officer in writing with a Board-reporting line, documented authority and revenue-independent compensation.","suggestedWording":"The Board appoints a qualified AML/BSA Compliance Officer who reports directly and independently to the Board, whose compensation is not tied to revenue, and who may be removed only by Board resolution.","complexity":"Low"},{"id":"GOV-3","domain":"GOV","requirement":"Three lines of defence with tester independence","expected":"First, second and third lines are documented; the compliance officer is excluded from the independent-testing function.","citation":"Mal Doc 1.2 §5.3","risk":"Medium","keywords":["three lines","line of defence","second line","independent","segregation of duties"],"remediation":"Document the three-lines model and ensure the independent test is performed by someone other than the compliance officer.","suggestedWording":"The programme operates a three-lines-of-defence model; the independent testing function is performed by parties independent of the functions tested and excludes the Compliance Officer.","complexity":"Low"},{"id":"RA-1","domain":"RA","requirement":"Documented enterprise-wide risk assessment","expected":"A written enterprise risk assessment evaluates inherent ML/TF/sanctions/fraud risk across customers, products, geographies/corridors, channels and counterparties; concludes on residual risk; refreshed at least annually and on material change.","citation":"Mal Doc 1.1; Doc 1.2 §4.1","risk":"Critical","keywords":["risk assessment","inherent risk","residual risk","methodology","annually","customers, products"],"remediation":"Produce a documented enterprise risk assessment across all risk categories with a residual-risk conclusion, refreshed annually and on material change.","suggestedWording":"The Company maintains a documented enterprise-wide risk assessment across customers, products, geographies, channels and counterparties, concluding on residual risk and refreshed at least annually and upon any material change.","complexity":"Medium"},{"id":"RA-2","domain":"RA","requirement":"Risk-to-control matrix","expected":"Each identified risk is mapped to a specific control, governing document, owner, review frequency and evidence.","citation":"Mal Doc 1.2 §4.1","risk":"High","keywords":["risk-to-control","control matrix","mapped to a control","owner","evidence"],"remediation":"Build a risk-to-control matrix linking every inherent risk to a named control, owner, frequency and evidence source.","suggestedWording":"A Risk-to-Control Matrix records, for each identified risk, the mitigating control, governing document, accountable owner, review frequency and evidence.","complexity":"Medium"},{"id":"RA-3","domain":"RA","requirement":"Customer & geographic risk-rating model","expected":"A documented, weighted customer risk-rating model assigns risk bands that drive due diligence, limits, monitoring and review cadence; corridor/geographic risk is classified on an internal basis.","citation":"Mal CRAM-01; Doc 1.2 §4.2-4.3","risk":"High","keywords":["risk rating","risk band","scoring","weighted","corridor","geographic risk","risk tier"],"remediation":"Implement a documented weighted risk-rating model with bands that drive treatment, plus an internal corridor/geographic risk classification.","suggestedWording":"Each customer is assigned a risk band by a documented, weighted risk-rating model; the band drives due-diligence depth, limits, monitoring intensity and review cadence. Geographic/corridor risk is classified on an internal, evidence-based methodology.","complexity":"Medium"},{"id":"CDD-1","domain":"CDD","requirement":"Customer identification programme (minimum identity data + verification)","expected":"Before transacting, collect full legal name, date of birth, residential address (no PO box) and a government-ID number; verify by documentary and non-documentary methods.","citation":"Mal Doc 1.3; 31 CFR 1020.220 expectations","risk":"Critical","keywords":["identity","identification","verify","date of birth","address","government id","document"],"remediation":"Define mandatory CIP fields and a verification standard (documentary + non-documentary) completed before account functionality.","suggestedWording":"Before an account becomes transactable the Company collects and verifies the customer's full legal name, date of birth, residential address and government-issued identification using documentary and non-documentary methods.","complexity":"Medium"},{"id":"CDD-2","domain":"CDD","requirement":"Beneficial ownership identification","expected":"For legal-entity customers, identify and verify beneficial owners at the 25% ownership prong plus one control person (enhanced 10% threshold for high-risk).","citation":"Mal Doc 1.3; 31 CFR 1010.230","risk":"High","keywords":["beneficial owner","ownership","control person","25%","ubo","ultimate beneficial"],"remediation":"Adopt a beneficial-ownership standard (25% + control person; 10% for high-risk) with verification and re-confirmation at review.","suggestedWording":"For each legal-entity customer the Company identifies and verifies every beneficial owner holding 25% or more and one control person (10% for high-risk relationships), re-confirmed at each periodic review.","complexity":"Medium"},{"id":"CDD-3","domain":"CDD","requirement":"Purpose, nature and source of funds","expected":"Understand and record the purpose and expected nature of the relationship; obtain risk-based source of funds.","citation":"Mal Doc 1.3; GA-1","risk":"High","keywords":["purpose","nature of the relationship","expected activity","source of funds"],"remediation":"Capture purpose/expected activity at onboarding and require risk-based source-of-funds evidence.","suggestedWording":"The Company records the purpose and expected nature of each relationship and obtains source-of-funds evidence on a risk-sensitive basis.","complexity":"Low"},{"id":"CDD-4","domain":"CDD","requirement":"Prohibited customers, refusal and completion deadline","expected":"Prohibited customer types are rejected at the gate; the relationship is refused/exited on evasion or failure to evidence; CDD that cannot be completed within a set period (e.g., 30 days) restricts the account.","citation":"Mal Doc 1.3; Doc 5.11","risk":"High","keywords":["prohibited","refuse","exit","reject","terminate","cannot be completed"],"remediation":"Define prohibited customer types, a refusal/exit procedure and a hard CDD-completion deadline that restricts the account.","suggestedWording":"Prohibited customer types are rejected at onboarding; relationships are refused or exited on evasion or failure to evidence identity, ownership or source of funds; CDD not completed within 30 days results in account restriction and exit consideration.","complexity":"Low"},{"id":"EDD-1","domain":"EDD","requirement":"EDD triggers and senior approval","expected":"Enhanced due diligence applies to high-risk relationships and requires senior-management/compliance approval to onboard or retain.","citation":"Mal Doc 1.3; Doc 1.8","risk":"Critical","keywords":["enhanced due diligence","edd","senior approval","senior management","high-risk","high risk"],"remediation":"Define EDD triggers and require documented senior approval to onboard/retain high-risk relationships.","suggestedWording":"High-risk relationships are subject to enhanced due diligence and require documented senior-compliance approval to onboard or retain.","complexity":"Low"},{"id":"EDD-2","domain":"EDD","requirement":"Source of wealth for high-risk / PEP","expected":"Full source-of-wealth is established for high-risk customers and PEPs.","citation":"Mal Doc 1.3; GA-1","risk":"High","keywords":["source of wealth","sow","establish wealth"],"remediation":"Require documented source-of-wealth establishment for high-risk and PEP relationships.","suggestedWording":"For high-risk relationships and PEPs the Company establishes and documents the customer's source of wealth.","complexity":"Medium"},{"id":"EDD-3","domain":"EDD","requirement":"Enhanced monitoring and critical-tier sign-off","expected":"EDD relationships receive enhanced monitoring cadence; the highest (critical) tier requires documented MLRO/senior sign-off and bespoke controls.","citation":"Mal Doc 1.3; CRAM-01","risk":"High","keywords":["enhanced monitoring","mlro sign-off","bespoke","reduced limits"],"remediation":"Apply enhanced monitoring to EDD relationships and require MLRO sign-off plus bespoke controls for the critical tier.","suggestedWording":"EDD relationships are subject to enhanced ongoing monitoring; critical-tier relationships additionally require documented MLRO sign-off and bespoke, board-visible controls.","complexity":"Medium"},{"id":"OM-1","domain":"OM","requirement":"Periodic review driven by risk","expected":"Periodic KYC/CDD refresh occurs on a cadence driven by the customer's risk band.","citation":"Mal Doc 1.3","risk":"High","keywords":["periodic review","refresh","review cycle","review cadence","ongoing due diligence"],"remediation":"Set band-driven periodic review cycles (e.g., higher-risk reviewed more frequently).","suggestedWording":"Customers are subject to periodic review on a cadence set by risk band, with higher-risk customers reviewed more frequently.","complexity":"Low"},{"id":"OM-2","domain":"OM","requirement":"Trigger-based reviews","expected":"Defined event triggers re-run screening and recompute the customer's risk rating.","citation":"Mal Doc 1.3","risk":"Medium","keywords":["trigger","event-driven","re-screen","recompute","trigger event"],"remediation":"Define a trigger set (new payer, adverse media, anomalies) that forces re-screening and rescoring.","suggestedWording":"Defined trigger events (e.g., adverse media, anomalous activity, new high-value counterparties) cause immediate re-screening and recomputation of the customer's risk rating.","complexity":"Low"},{"id":"OM-3","domain":"OM","requirement":"Continuous / delta re-screening","expected":"Customer base is re-screened on each watchlist/list update (delta re-screen).","citation":"Mal Doc 1.4; Doc 1.3","risk":"High","keywords":["delta","watchlist update","continuous screening","ongoing screening","each update"],"remediation":"Implement automatic delta re-screening of the full base on each list update.","suggestedWording":"The full customer and counterparty base is automatically re-screened on each watchlist update.","complexity":"Medium"},{"id":"TM-1","domain":"TM","requirement":"Transaction monitoring coverage","expected":"All inbound, outbound and card activity is monitored against a typology library (structuring, mule, trade-based ML, corridor layering, card anomalies).","citation":"Mal Doc 1.5","risk":"Critical","keywords":["transaction monitoring","monitor","typolog","structuring","alert","suspicious patterns"],"remediation":"Implement transaction monitoring covering all rails with a documented typology rule library.","suggestedWording":"All inbound funding, outbound payments and card activity are monitored in line with a documented typology library, including structuring, mule activity, trade-based laundering, corridor layering and card anomalies.","complexity":"High"},{"id":"TM-2","domain":"TM","requirement":"Fail-closed, pre-availability screening","expected":"Funds are not made available, and payments do not leave, without a recorded screening disposition; the system fails closed on outage.","citation":"Mal Doc 1.5; Doc 1.4","risk":"High","keywords":["fail-closed","fail closed","suspense","pre-availability","recorded disposition","quarantine"],"remediation":"Quarantine inbound/outbound funds until a recorded disposition exists; ensure monitoring fails closed.","suggestedWording":"No funds become available and no payment is dispatched without a recorded monitoring/screening disposition; on system outage the platform fails closed and funds remain quarantined.","complexity":"High"},{"id":"TM-3","domain":"TM","requirement":"Advisory incorporation and rule tuning","expected":"Regulatory advisories/typologies are incorporated promptly (e.g., within 30 days); rules are tuned under documented change control.","citation":"Mal Doc 1.5","risk":"Medium","keywords":["advisory","tuning","change control","calibrat","incorporated within"],"remediation":"Adopt a 30-day advisory-incorporation standard and an evidence-based, change-controlled tuning process.","suggestedWording":"FinCEN/regulatory advisories are incorporated into monitoring rules and training within 30 days; rule tuning is evidence-based and performed under documented change control.","complexity":"Medium"},{"id":"TM-4","domain":"TM","requirement":"Alert handling and decision provenance","expected":"Alerts are worked under documented desk references; dispositions (including false-positive rationale) are recorded in examiner-ready form; aged items escalate.","citation":"Mal Doc 1.5","risk":"Medium","keywords":["alert","disposition","decision provenance","dpl","four-eyes","rationale"],"remediation":"Document alert-handling desk references and a decision-provenance log; auto-escalate aged items.","suggestedWording":"Alerts are adjudicated under documented desk references; every disposition, including false-positive closures, is recorded in an examiner-ready decision-provenance log, and items aged beyond a set period auto-escalate.","complexity":"Medium"},{"id":"SANC-1","domain":"SANC","requirement":"Sanctions screening scope and timing","expected":"All customers, beneficial owners, counterparties, beneficiaries and card merchants are screened at onboarding and continuously against OFAC SDN, enhanced lists and UN/EU overlays.","citation":"Mal Doc 1.4; SCP","risk":"Critical","keywords":["sanctions","ofac","sdn","screening","watchlist","un","screened against"],"remediation":"Screen all parties at onboarding and continuously against OFAC SDN, enhanced and UN/EU lists.","suggestedWording":"All customers, beneficial owners, counterparties, beneficiaries and merchants are screened at onboarding and continuously against the OFAC SDN List, enhanced lists and UN/EU overlays.","complexity":"Medium"},{"id":"SANC-2","domain":"SANC","requirement":"List-update SLA and batch re-screening","expected":"OFAC SDN deltas are live in screening within 24 hours (other lists within 48); every update triggers batch re-screening of the entire base.","citation":"Mal Doc 1.4","risk":"High","keywords":["list update","re-screen","24 hours","48 hours","batch","same business day"],"remediation":"Set a 24h SDN / 48h other-list update SLA with automatic full-base batch re-screening.","suggestedWording":"OFAC SDN updates are live in screening within 24 hours and other lists within 48 hours; each update triggers automatic batch re-screening of the entire customer, counterparty and vendor base.","complexity":"Medium"},{"id":"SANC-3","domain":"SANC","requirement":"Blocking/rejection reporting, 50% rule and ARBP","expected":"Blocking and rejection reports are filed within 10 business days; the 50% rule is applied; the Annual Report of Blocked Property is filed by 30 September.","citation":"Mal Doc 1.4; 31 CFR 501.603","risk":"Critical","keywords":["blocking","reject","10 business days","blocked property","50 percent","annual report"],"remediation":"Implement 10-business-day blocking/reject reporting, 50%-rule logic and the 30 September ARBP filing.","suggestedWording":"Blocking and rejection reports are filed with OFAC within 10 business days; the 50% Rule is applied to ownership; the Annual Report of Blocked Property is filed by 30 September for property held as of 30 June.","complexity":"Medium"},{"id":"SANC-4","domain":"SANC","requirement":"Matching quality and independent list validation","expected":"Screening uses fuzzy/transliteration matching, is regression-tested, and list presence/freshness is independently validated (never vendor attestation alone), with seeded-name testing.","citation":"Mal Doc 1.4; Doc 2.3","risk":"High","keywords":["fuzzy","transliteration","seeded","list-load","independent validation","regression"],"remediation":"Adopt fuzzy/transliteration matching with independent list-load validation and quarterly seeded-name testing.","suggestedWording":"Screening applies approved fuzzy and per-script transliteration matching; list presence and freshness are independently validated (never on vendor attestation alone) and proven by periodic seeded-name testing.","complexity":"High"},{"id":"SANC-5","domain":"SANC","requirement":"Geolocation screening and anti-tipping-off","expected":"Device/IP geolocation is screened to detect transacting from sanctioned jurisdictions; customer-facing communications on holds use tipping-off-safe language.","citation":"Mal Doc 1.4","risk":"Medium","keywords":["geolocation","ip","tipping-off","safe language","jurisdiction"],"remediation":"Add IP/geolocation screening and template-locked, tipping-off-safe hold messaging.","suggestedWording":"Device IP and session geolocation are screened to prevent transacting from comprehensively sanctioned jurisdictions; all customer-facing communications on a hold use template-locked, tipping-off-safe language.","complexity":"Medium"},{"id":"PEP-1","domain":"PEP","requirement":"PEP identification by dual method","expected":"PEP status is identified by both database screening and self-certification at onboarding and on list updates; self-certification supplements, never replaces, screening.","citation":"Mal Doc 1.8","risk":"High","keywords":["pep","politically exposed","self-certification","screening","database"],"remediation":"Screen all customers and beneficial owners against PEP databases and require self-certification.","suggestedWording":"PEP status is identified by both database screening and customer self-certification at onboarding and on each list update; self-certification supplements but never replaces database screening.","complexity":"Low"},{"id":"PEP-2","domain":"PEP","requirement":"PEP EDD treatment","expected":"A confirmed PEP is escalated to the high-risk tier with senior approval, source-of-wealth establishment and a foreign-corruption focus.","citation":"Mal Doc 1.8; USA PATRIOT Act §312; FATF R.12","risk":"High","keywords":["pep","senior approval","source of wealth","foreign corruption","enhanced"],"remediation":"Treat confirmed PEPs as high-risk with senior approval, source-of-wealth and corruption-focused EDD.","suggestedWording":"A confirmed PEP is treated as high-risk, requiring senior-compliance approval, source-of-wealth establishment and enhanced due diligence calibrated to detect proceeds of foreign corruption.","complexity":"Low"},{"id":"PEP-3","domain":"PEP","requirement":"Family, associates and ongoing PEP monitoring","expected":"Immediate family members and close associates are treated as PEPs; PEP relationships are re-screened on each update and reassessed at review; declassification only on documented rationale.","citation":"Mal Doc 1.8","risk":"Medium","keywords":["family","close associate","ongoing","re-screen","reassess"],"remediation":"Extend PEP treatment to family/associates and require ongoing re-screening with documented declassification.","suggestedWording":"Immediate family members and close associates of PEPs are treated as PEPs; relationships are re-screened on each update and reassessed at review, with declassification only on documented MLRO rationale.","complexity":"Low"},{"id":"SAR-1","domain":"SAR","requirement":"SAR filing and timeline","expected":"Suspicious activity is reported within 30 days of detection (or a complete escalation package to the partner filer); continuing-activity SARs are filed on a ~90-day cycle.","citation":"Mal Doc 1.7; 31 CFR 1022.320","risk":"Critical","keywords":["sar","suspicious activity","30 days","file","report"],"remediation":"Define a SAR process with a 30-day filing clock (or partner-escalation package) and continuing-SAR cycle.","suggestedWording":"Suspicious activity is reported within 30 days of detection via the appropriate filing channel (or a complete escalation package to the partner filer within ~20 days), with continuing-activity SARs filed approximately every 90 days.","complexity":"Medium"},{"id":"SAR-2","domain":"SAR","requirement":"SAR confidentiality and anti-tipping-off","expected":"It is prohibited to disclose that a SAR is filed/contemplated; SAR records are access-restricted and retained for five years.","citation":"Mal Doc 1.7; 31 U.S.C. §5318(g)","risk":"Critical","keywords":["confidential","tipping","disclose","access-restricted","never disclose"],"remediation":"Prohibit tipping-off, restrict SAR access and retain SAR records for five years.","suggestedWording":"No person is informed that a SAR has been, will be, or is being considered for filing; SAR records are access-restricted to authorised compliance staff and retained for five years from filing.","complexity":"Low"},{"id":"SAR-3","domain":"SAR","requirement":"SAR governance and quality assurance","expected":"Qualifying cases are decided by a SAR committee/decisioning process with pre-filing QA; SAR trends are reported to the Board.","citation":"Mal Doc 1.7; Doc 1.2 §4.5","risk":"Medium","keywords":["sar committee","decision","quality assurance","trend","pre-filing"],"remediation":"Establish a SAR decisioning body, pre-filing QA and Board trend reporting.","suggestedWording":"Qualifying cases are decided by a SAR Committee with documented pre-filing quality assurance; SAR volumes and themes are reported to the Board on a quarterly basis.","complexity":"Low"},{"id":"SAR-4","domain":"SAR","requirement":"314(a) handling and evasion indicators","expected":"Section 314(a) requests are searched within the mandated period and kept confidential; evasion indicators are treated as reportable.","citation":"Mal Doc 1.7","risk":"Medium","keywords":["314(a)","314a","evasion","reportable","information request"],"remediation":"Define 314(a) search/confidentiality handling and treat evasion attempts as SAR-reportable.","suggestedWording":"Section 314(a) requests are searched against required records within the mandated period and kept strictly confidential; attempts to evade identification or reporting are themselves treated as reportable indicators.","complexity":"Low"},{"id":"REP-1","domain":"REP","requirement":"Currency transaction reporting (CTR)","expected":"Currency transactions over $10,000 (single or aggregated in a business day) are reported on a CTR within 15 calendar days; structuring is detected.","citation":"Mal Doc 1.7; 31 CFR 1010.311","risk":"Medium","keywords":["ctr","currency transaction","10,000","15 days","aggregat"],"remediation":"Maintain CTR procedures with the $10,000 threshold, aggregation and 15-day filing (even if non-cash).","suggestedWording":"Currency transactions exceeding $10,000 (single or aggregated for one person in one business day) are reported on a CTR within 15 calendar days; structuring to evade the threshold is detected and reported.","complexity":"Low"},{"id":"REP-2","domain":"REP","requirement":"Travel Rule","expected":"For transmittals of $3,000 or more, required originator and beneficiary information is recorded and travels to the receiving institution; true names are used and the firm's address is not substituted.","citation":"Mal Doc 1.6; 31 CFR 1010.410; FATF R.16","risk":"High","keywords":["travel rule","originator","beneficiary","3,000","transmittal"],"remediation":"Implement Travel Rule data capture and transmission for transmittals ≥$3,000.","suggestedWording":"For transmittals of funds of $3,000 or more, required originator and beneficiary information is recorded and transmitted to the receiving institution using true names; the Company's address is never substituted for the customer's.","complexity":"Medium"},{"id":"REC-1","domain":"REC","requirement":"Retention schedule","expected":"AML records are retained for at least five years (sanctions records aligned to ten years), reconstruction-grade.","citation":"Mal Doc 1.9; 31 CFR Chapter X","risk":"High","keywords":["retention","five years","5 years","retain","ten years","records"],"remediation":"Adopt a written retention schedule: ≥5 years (sanctions 10 years), reconstruction-grade.","suggestedWording":"All AML/CFT records are retained for at least five years (sanctions-relevant records for ten years), kept reconstruction-grade and producible to regulators.","complexity":"Low"},{"id":"REC-2","domain":"REC","requirement":"Record integrity, legal hold and disposal","expected":"Records are tamper-evident, versioned and time-stamped; legal holds suspend disposal; secure disposal is logged.","citation":"Mal Doc 1.9","risk":"Medium","keywords":["tamper","legal hold","disposal","integrity","versioned"],"remediation":"Add record-integrity, legal-hold and secure-disposal controls with a disposal log.","suggestedWording":"Records are tamper-evident, versioned and time-stamped; legal holds suspend disposal; records past retention and not held are securely disposed of with a disposal log retained.","complexity":"Low"},{"id":"REC-3","domain":"REC","requirement":"Examiner production capability","expected":"The firm can produce examiner-grade extracts (full history, dispositions, list versions) within 10 business days, proven by an annual lookback drill.","citation":"Mal Doc 1.9; Doc 2.3","risk":"Medium","keywords":["examiner","extract","reconstruct","lookback","10 business days"],"remediation":"Build and annually test a 10-business-day examiner-extract capability.","suggestedWording":"The Company can produce examiner-grade extracts for any account, including closed accounts, within 10 business days, and proves this capability in an annual lookback exercise.","complexity":"Medium"},{"id":"TRN-1","domain":"TRN","requirement":"Role-based AML training","expected":"Role-based AML/CFT training is delivered at hire (within ~30 days, before compliance duties) and at least annually.","citation":"Mal Doc 1.2 §6; Doc 2.2","risk":"High","keywords":["training","role-based","annual","at hire","awareness"],"remediation":"Deliver role-based AML training at hire and at least annually.","suggestedWording":"All relevant staff receive role-based AML/CFT training within 30 days of hire (before performing compliance-relevant duties) and at least annually thereafter.","complexity":"Low"},{"id":"TRN-2","domain":"TRN","requirement":"Testing, attestation and completion tracking","expected":"Training requires a minimum pass score with signed attestation; completion is tracked to 100% and records retained for five years.","citation":"Mal Doc 1.2 §6","risk":"Medium","keywords":["test","attestation","completion","pass score","80%"],"remediation":"Add a pass threshold, signed attestation and completion tracking with retained records.","suggestedWording":"Training requires a minimum 80% test score and a signed attestation; completion is tracked to 100% by year-end and records are retained for five years.","complexity":"Low"},{"id":"TRN-3","domain":"TRN","requirement":"Advisory and typology updates in training","expected":"New advisories/typologies are incorporated into training within ~30 days of publication.","citation":"Mal Doc 1.2 §6","risk":"Low","keywords":["advisory","update","typology","30 days"],"remediation":"Commit to incorporating new advisories into training within 30 days.","suggestedWording":"Material regulatory advisories and emerging typologies are incorporated into training content within 30 days of publication.","complexity":"Low"},{"id":"AUD-1","domain":"AUD","requirement":"Independent testing of the programme","expected":"An independent test of the AML/sanctions programme is performed by parties independent of the functions tested (not the CO), within 12 months of launch and at least annually, reporting directly to the Board.","citation":"Mal Doc 2.3; 31 CFR 1022.210","risk":"Critical","keywords":["independent test","independent audit","independent of","board","at least annually"],"remediation":"Commission an independent annual audit (first within 12 months of launch) reporting to the Board.","suggestedWording":"An independent test of the BSA/AML and sanctions programme is conducted by parties independent of the functions tested (excluding the Compliance Officer), within 12 months of launch and at least annually, reporting directly to the Board.","complexity":"Medium"},{"id":"AUD-2","domain":"AUD","requirement":"Audit scope","expected":"Audit scope covers risk-assessment adequacy, CIP/KYC/EDD file testing, monitoring/alert quality, SAR decisioning, OFAC configuration and blocked-property handling, Travel Rule, recordkeeping, training and partner oversight.","citation":"Mal Doc 2.3","risk":"High","keywords":["scope","file testing","sampl","alert quality","coverage"],"remediation":"Define a comprehensive audit scope across all programme pillars and partner oversight.","suggestedWording":"The independent audit scope includes, at minimum, the risk assessment, CIP/KYC/EDD file testing, monitoring and alert-disposition quality, SAR decisioning and timeliness, OFAC configuration and blocked-property handling, Travel Rule completeness, recordkeeping retrievability, training, and partner oversight.","complexity":"Medium"},{"id":"AUD-3","domain":"AUD","requirement":"Technical assurance and remediation tracking","expected":"Seeded-name/wallet tests, fail-closed tests and lookback drills are performed; findings are tracked to closure.","citation":"Mal Doc 2.3","risk":"Medium","keywords":["seeded","fail-closed","lookback","remediation","tracked to closure"],"remediation":"Add seeded-test, fail-closed and lookback assurance with remediation tracking.","suggestedWording":"The programme is assured by periodic seeded-name/wallet testing, fail-closed testing and lookback drills, with all findings tracked to closure and verified.","complexity":"Medium"},{"id":"TPO-1","domain":"TPO","requirement":"Third-party lifecycle oversight","expected":"A full third-party lifecycle (planning, due diligence, contracting, ongoing monitoring, termination) applies to all partners that touch the funds flow or data.","citation":"Mal Doc 0.3/0.4; FDIC FIL-29-2023","risk":"High","keywords":["third-party","third party","vendor","due diligence","ongoing monitoring","lifecycle"],"remediation":"Apply a documented third-party risk lifecycle to all partners, proportionate to criticality.","suggestedWording":"All third parties that move funds, see customer data or run critical systems are subject to a documented lifecycle: planning, due diligence, contracting, ongoing monitoring and termination, proportionate to criticality.","complexity":"Medium"},{"id":"TPO-2","domain":"TPO","requirement":"Processor non-reliance and model risk","expected":"Processors (IDV/screening) are never relied upon for CDD; the firm retains CDD ownership and performs model-risk management/validation of vendor models.","citation":"Mal Doc 0.4; Doc 1.2 §8","risk":"High","keywords":["processor","reliance","model risk","retain","validation","cdd ownership"],"remediation":"State that processors are not CDD reliance and add independent validation of vendor models.","suggestedWording":"Identity-verification and screening vendors are processors only; the Company retains full ownership of CDD and all decisions and independently validates vendor models rather than relying on vendor output.","complexity":"Medium"},{"id":"TPO-3","domain":"TPO","requirement":"Partner scorecards and termination triggers","expected":"Partners are scored quarterly against documented KPIs/KRIs; non-discretionary remediation-or-exit triggers on sustained breaches (e.g., two consecutive quarters).","citation":"Mal Doc 0.4","risk":"Medium","keywords":["scorecard","kpi","kri","termination","threshold","two consecutive"],"remediation":"Score partners quarterly and define non-discretionary termination triggers.","suggestedWording":"Each partner is scored quarterly against documented thresholds; any partner breaching its thresholds for two consecutive quarters enters mandatory, non-discretionary remediation or exit.","complexity":"Medium"},{"id":"TPO-4","domain":"TPO","requirement":"Agent / payout-network oversight","expected":"Payout agents are subject to OFAC/background checks on a defined cycle, AML audits, Travel-Rule data quality, and confirmation of no hawala/hundi settlement.","citation":"Mal Doc 0.4; GA-4","risk":"High","keywords":["agent","background check","hawala","hundi","agent audit","authorisation"],"remediation":"Add agent-network controls: periodic OFAC/background checks, agent AML audits, no IVTS settlement.","suggestedWording":"Payout agents are subject to OFAC and background checks at least every three years, periodic AML audits, Travel-Rule data-quality checks, and documented confirmation that no hawala/hundi/IVTS settlement occurs in the chain.","complexity":"Medium"},{"id":"DOB-1","domain":"DOB","requirement":"Remote identity verification and liveness","expected":"Remote onboarding verifies identity with liveness/selfie match and document verification, supplemented by non-documentary checks and transliteration handling.","citation":"Mal Doc 1.3","risk":"High","keywords":["liveness","selfie","remote","biometric","non-documentary","document verification"],"remediation":"Implement liveness/selfie + document verification with non-documentary corroboration for remote onboarding.","suggestedWording":"Remote onboarding verifies identity through document verification and a liveness/selfie match, supplemented by non-documentary verification and per-script transliteration handling.","complexity":"Medium"},{"id":"DOB-2","domain":"DOB","requirement":"Pre-funding sanctions/PEP gate","expected":"Sanctions and PEP screening complete before account functionality; the onboarding flow fails closed on unresolved alerts.","citation":"Mal Doc 1.3; Doc 1.4","risk":"High","keywords":["before functionality","screen at onboarding","gate","fail","unresolved"],"remediation":"Gate account functionality behind cleared sanctions/PEP screening; fail closed on unresolved alerts.","suggestedWording":"No account becomes functional until sanctions and PEP screening are complete and any alerts are resolved; unresolved alerts hold the account closed.","complexity":"Medium"},{"id":"DOB-3","domain":"DOB","requirement":"Anti-mule and device/geo controls","expected":"Digital onboarding applies anti-mule controls and device/geo/IP signals, with first-payer and new-payer holds.","citation":"Mal Doc 1.3; Doc 1.5","risk":"Medium","keywords":["mule","device","geo","ip","first-payer","new payer"],"remediation":"Add anti-mule messaging plus device/geo signals and first-payer holds at onboarding.","suggestedWording":"Digital onboarding presents anti-mule controls and ingests device, geolocation and IP signals, applying holds on first and new high-value payers.","complexity":"Medium"},{"id":"ESC-1","domain":"ESC","requirement":"Tiered alert SLAs","expected":"Alerts are triaged into severities (e.g., P1/P2/P3) with defined response SLAs (e.g., P1 within 4 hours).","citation":"Mal Doc 1.2 §4.5; Doc 1.5","risk":"High","keywords":["p1","severity","sla","escalation","tier","4 hours"],"remediation":"Define tiered alert severities with response SLAs.","suggestedWording":"Alerts are triaged into P1/P2/P3 severities with defined response SLAs (P1 within 4 hours, P2 within 24 hours, P3 within 48 hours).","complexity":"Low"},{"id":"ESC-2","domain":"ESC","requirement":"Issue and remediation management","expected":"Compliance exceptions and issues are tracked in a register with severity-based remediation SLAs and Board reporting.","citation":"Mal Doc 1.2 §4.9","risk":"Medium","keywords":["issue","remediation","exception","register","corrective"],"remediation":"Maintain an exceptions/issues register with severity-based remediation SLAs and Board reporting.","suggestedWording":"Compliance exceptions and issues are tracked from identification to closure in a register, with remediation SLAs and Board reporting driven by severity.","complexity":"Low"},{"id":"ESC-3","domain":"ESC","requirement":"Compliance-officer stop authority","expected":"The compliance officer can stop, freeze or escalate any transaction or account presenting material risk, regardless of commercial value.","citation":"Mal Doc 1.2 §5.2","risk":"Medium","keywords":["stop","freeze","authority","veto","regardless of commercial"],"remediation":"Grant the compliance officer documented authority to stop/freeze regardless of commercial value.","suggestedWording":"The Compliance Officer has documented authority to stop or freeze any transaction or account, and to veto products, partners or corridors, where material AML/CTF risk is present, regardless of commercial value.","complexity":"Low"}]};

/* ============================================================================
   AML/CFT POLICY EXAMINER
   Assesses any partner AML/CFT policy / programme against the authoritative
   Mal framework (AML_FRAMEWORK above): coverage-based control screen + risk-
   weighted scoring + gap analysis + enhancement recommendations + dashboard.
   Deterministic engine always runs; an optional AI deep-review enriches it.
============================================================================ */
const AML_RISKC = { Critical: "#ef4444", High: "#f59e0b", Medium: "#1e63e9", Low: "#17a34a" };
const amlBand = (s) => s >= 85 ? { t: "Strong", c: "#17a34a" } : s >= 70 ? { t: "Adequate", c: "#1e63e9" } : s >= 55 ? { t: "Needs improvement", c: "#f59e0b" } : s >= 40 ? { t: "Weak", c: "#f97316" } : { t: "Inadequate", c: "#ef4444" };
const amlMaturity = (s) => s >= 85 ? { n: 5, t: "Optimised" } : s >= 70 ? { n: 4, t: "Managed" } : s >= 55 ? { n: 3, t: "Defined" } : s >= 40 ? { n: 2, t: "Developing" } : { n: 1, t: "Initial" };
const amlReadiness = (s, crit) => (s >= 85 && crit === 0) ? "Examination-ready" : s >= 70 ? "Substantially ready" : s >= 55 ? "Remediation required" : s >= 40 ? "Material gaps" : "Not ready";

function amlExamine(rawText) {
  const text = (rawText || "").toLowerCase();
  const W = AML_FRAMEWORK.riskWeights;
  const controls = AML_FRAMEWORK.controls.map(c => {
    const hits = c.keywords.filter(k => text.includes(k.toLowerCase()));
    const ratio = hits.length / c.keywords.length;
    let status = hits.length === 0 ? "missing" : ratio >= 0.6 ? "covered" : "partial";
    const score = status === "covered" ? 100 : status === "partial" ? 50 : 0;
    return { ...c, hits, status, score, w: W[c.risk] || 1 };
  });
  const wavg = (arr) => { const tw = arr.reduce((s, x) => s + x.w, 0) || 1; return Math.round(arr.reduce((s, x) => s + x.score * x.w, 0) / tw); };
  const overall = wavg(controls);
  const domains = AML_FRAMEWORK.domains.map(d => {
    const cs = controls.filter(c => c.domain === d.id);
    const score = cs.length ? wavg(cs) : 0;
    const missing = cs.filter(c => c.status === "missing").length;
    const partial = cs.filter(c => c.status === "partial").length;
    return { ...d, score, total: cs.length, covered: cs.filter(c => c.status === "covered").length, partial, missing };
  });
  const criticalFindings = controls.filter(c => c.risk === "Critical" && c.status !== "covered");
  const highObs = controls.filter(c => c.risk === "High" && c.status === "missing");
  const gaps = controls.filter(c => c.status !== "covered")
    .sort((a, b) => (b.w - a.w) || a.domain.localeCompare(b.domain));
  const strengths = domains.filter(d => d.score >= 80).sort((a, b) => b.score - a.score);
  const weaknesses = domains.filter(d => d.score < 55).sort((a, b) => a.score - b.score);
  const effectiveness = Math.max(0, Math.min(100, overall - 4 * criticalFindings.length));
  const mat = amlMaturity(overall);
  return { overall, domains, controls, gaps, criticalFindings, highObs, strengths, weaknesses,
    band: amlBand(overall), maturity: mat, readiness: amlReadiness(overall, criticalFindings.length),
    effectiveness, at: new Date().toISOString() };
}
const AML_PRIORITY = (risk) => risk === "Critical" ? { t: "P1", c: "#ef4444" } : risk === "High" ? { t: "P1", c: "#f59e0b" } : risk === "Medium" ? { t: "P2", c: "#1e63e9" } : { t: "P3", c: "#17a34a" };

const AML_SAMPLE = `ACME PAYMENTS LTD - ANTI-MONEY LAUNDERING POLICY (v1)
1. We are committed to preventing money laundering and terrorist financing. A Compliance Officer is appointed to oversee the programme and reports to management.
2. Customer due diligence: at onboarding we collect the customer's full legal name, date of birth, residential address and a government-issued identification document, and verify identity using documents. Remote customers complete a selfie/liveness check.
3. Sanctions: we screen customers against the OFAC SDN list at onboarding and maintain a watchlist screening process.
4. We monitor transactions for suspicious patterns such as structuring and file suspicious activity reports to the authorities when required.
5. Records are retained for five years.
6. Staff receive AML training when they join and annually.
7. PEPs: customers are screened for politically exposed person status at onboarding.`;

function AMLExaminer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [ai, setAi] = useState(null);
  const [openRec, setOpenRec] = useState({});

  const run = () => { setAi(null); setResult(amlExamine(text)); };
  const loadSample = () => { setText(AML_SAMPLE); setResult(null); setAi(null); };

  async function deepReview() {
    if (!result) return;
    setAiBusy(true);
    const fw = AML_FRAMEWORK.controls.map(c => `${c.id} [${c.risk}] ${c.requirement} (expect: ${c.expected})`).join("\n");
    const prompt = `You are an experienced AML/CFT regulatory examiner and internal auditor. Assess the PARTNER POLICY below against the Mal authoritative control framework. Be evidence-based and cite control IDs. Return ONLY JSON (no prose, no fences): {"rating": string, "summary": string up to 600 chars, "topStrengths": [string], "topWeaknesses": [string], "contradictions": [string], "narrative": string up to 1200 chars}.\n\nFRAMEWORK CONTROLS:\n${fw}\n\nPARTNER POLICY:\n"""${text.slice(0, 9000)}"""`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      const t = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      const a = t.indexOf("{"), b = t.lastIndexOf("}");
      setAi(a !== -1 ? JSON.parse(t.slice(a, b + 1)) : { error: true });
    } catch (e) { setAi({ error: true }); }
    setAiBusy(false);
  }

  function exportXlsx() {
    if (!result) return;
    try {
      const wb = XLSX.utils.book_new();
      const sum = [["Mal AML/CFT Policy Examiner - Assessment"], ["Generated", fmtDT(result.at)],
        ["Overall compliance score", result.overall], ["Rating", result.band.t],
        ["Maturity", result.maturity.n + " - " + result.maturity.t], ["Regulatory readiness", result.readiness],
        ["Programme effectiveness", result.effectiveness], ["Critical gaps", result.criticalFindings.length], [],
        ["Domain", "Score", "Covered", "Partial", "Missing", "Total"]];
      result.domains.forEach(d => sum.push([d.name, d.score, d.covered, d.partial, d.missing, d.total]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), "Summary");
      const g = [["Ref", "Domain", "Risk", "Status", "Requirement", "Expected control", "Regulatory basis", "Remediation", "Suggested wording", "Priority", "Complexity"]];
      result.gaps.forEach(c => { const dn = AML_FRAMEWORK.domains.find(x => x.id === c.domain)?.name || c.domain; g.push([c.id, dn, c.risk, c.status, c.requirement, c.expected, c.citation, c.remediation, c.suggestedWording, AML_PRIORITY(c.risk).t, c.complexity]); });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(g), "Gap analysis");
      XLSX.writeFile(wb, "Mal_AML_Examination.xlsx");
    } catch (e) {}
  }

  const dn = (id) => AML_FRAMEWORK.domains.find(x => x.id === id)?.name || id;

  return (
    <>
      <h1 className="h1">AML/CFT Policy Examiner</h1>
      <p className="sub">Upload or paste any partner AML/CFT policy, compliance programme, financial-crime manual, onboarding procedure or control document. It is assessed against Mal's authoritative framework ({AML_FRAMEWORK.controls.length} controls across {AML_FRAMEWORK.domains.length} domains, derived from the Mal AML/BSA Programme, CDD, Sanctions/OFAC, TM, SAR/CTR, PEP, Recordkeeping, Independent Testing and Vendor Oversight policies) with section- and control-level gap analysis, risk-weighted scoring and remediation.</p>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3>Submitted policy</h3>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste the partner's AML/CFT policy text here..." style={{ minHeight: 150 }} />
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn gold" onClick={run} disabled={!text.trim()}><ClipboardCheck size={14} /> Run examination</button>
          <button className="btn" onClick={loadSample}><FileText size={14} /> Load sample policy</button>
          {text && <button className="btn ghost" onClick={() => { setText(""); setResult(null); setAi(null); }}><X size={14} /> Clear</button>}
          <span className="spacer" />
          {result && <button className="btn" onClick={exportXlsx}><Download size={14} /> Export to Excel</button>}
          {result && <button className="btn" onClick={deepReview} disabled={aiBusy}><Radio size={14} /> {aiBusy ? "Reviewing..." : "AI deep review"}</button>}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Coverage-based automated screen - findings are evidence-based leads citing the controlling Mal policy; confirm with examiner judgment before action. Text stays in your browser; the optional AI deep review sends the text for a qualitative second opinion.</div>
      </div>

      {!result && (
        <div className="card"><h3>What this examiner checks</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))" }}>
            {AML_FRAMEWORK.domains.map(d => (
              <div key={d.id} className="row" style={{ gap: 8, padding: "6px 0" }}><span className="catdot" style={{ background: d.color }} /><span style={{ fontSize: 12.5 }}>{d.name}</span></div>
            ))}
          </div>
        </div>
      )}

      {result && (() => {
        const r = result;
        return (
          <>
            {/* KPI row */}
            <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 13 }}>
              <div className="card" style={{ textAlign: "center" }}><h3>Overall compliance</h3>
                <div className="ring" style={{ width: 64, height: 64, margin: "4px auto", background: `conic-gradient(${r.band.c} ${r.overall * 3.6}deg,#e7e9f2 0)` }}><div className="hole" style={{ fontSize: 16, color: r.band.c }}>{r.overall}</div></div>
                <span className="chip" style={{ background: r.band.c + "22", color: r.band.c }}>{r.band.t}</span>
              </div>
              <Kpi label="Maturity" value={r.maturity.n + "/5"} sub={r.maturity.t} />
              <Kpi label="Regulatory readiness" value={r.readiness} />
              <Kpi label="Programme effectiveness" value={r.effectiveness} accent={amlBand(r.effectiveness).c} />
              <Kpi label="Critical gaps" value={r.criticalFindings.length} accent={r.criticalFindings.length ? "var(--red)" : "var(--green)"} />
            </div>

            {/* Heat map */}
            <div className="card" style={{ marginBottom: 13 }}><h3>Compliance heat map by domain</h3>
              <div className="heat">
                {r.domains.map(d => { const b = amlBand(d.score); return (
                  <div className="tile" key={d.id} style={{ borderColor: b.c + "66" }}>
                    <div className="row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: 12.5 }}>{d.name}</b><span className="catdot" style={{ background: d.color }} /></div>
                    <div className="kpi" style={{ fontSize: 20, color: b.c, marginTop: 6 }}>{d.score}</div>
                    <div className="bar" style={{ marginTop: 6 }}><span style={{ width: d.score + "%", background: b.c }} /></div>
                    <div className="muted" style={{ fontSize: 10.5, marginTop: 5 }}>{d.covered}/{d.total} covered{d.partial ? ` · ${d.partial} partial` : ""}{d.missing ? ` · ${d.missing} missing` : ""}</div>
                  </div>
                ); })}
              </div>
            </div>

            {/* Executive summary */}
            <div className="card" style={{ marginBottom: 13 }}><h3>Executive summary</h3>
              <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <span className="chip" style={{ background: r.band.c + "22", color: r.band.c }}>Overall: {r.band.t} ({r.overall})</span>
                <span className="chip" style={{ background: "#f5f6fb" }}>Maturity {r.maturity.n}/5 - {r.maturity.t}</span>
                <span className="chip" style={{ background: "#f5f6fb" }}>{r.readiness}</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Key strengths</div>
                  {r.strengths.length ? r.strengths.slice(0, 6).map(d => <div key={d.id} className="row" style={{ gap: 7, padding: "3px 0", fontSize: 12.5 }}><Check size={13} color="var(--green)" /> {d.name} ({d.score})</div>) : <div className="muted" style={{ fontSize: 12.5 }}>No domain scored 80+ yet.</div>}
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Key weaknesses</div>
                  {r.weaknesses.length ? r.weaknesses.slice(0, 6).map(d => <div key={d.id} className="row" style={{ gap: 7, padding: "3px 0", fontSize: 12.5 }}><AlertTriangle size={13} color="var(--red)" /> {d.name} ({d.score})</div>) : <div className="muted" style={{ fontSize: 12.5 }}>No domain below 55.</div>}
                </div>
              </div>
              {r.criticalFindings.length > 0 && <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Critical findings</div>
                {r.criticalFindings.map(c => <div key={c.id} className="row" style={{ gap: 8, padding: "4px 0", fontSize: 12.5, alignItems: "flex-start" }}><span className="chip" style={{ background: "#ef444422", color: "#ef4444" }}>{c.id}</span><span>{c.requirement} <span className="muted">- {c.status === "missing" ? "not addressed" : "only partially addressed"} ({c.citation})</span></span></div>)}
              </div>}
            </div>

            {/* AI deep review */}
            {ai && !ai.error && <div className="card" style={{ marginBottom: 13, borderColor: "var(--gold)" }}>
              <h3 style={{ color: "var(--gold)" }}><Radio size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />AI examiner - qualitative second opinion</h3>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>{ai.rating && <span className="chip" style={{ background: "var(--brand50)", color: "var(--brand600)" }}>{ai.rating}</span>}</div>
              {ai.summary && <p style={{ fontSize: 13, marginTop: 0 }}>{ai.summary}</p>}
              {ai.contradictions && ai.contradictions.length > 0 && <><div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", margin: "8px 0 4px" }}>Contradictions / inconsistencies</div>{ai.contradictions.map((x, i) => <div key={i} className="row" style={{ gap: 7, fontSize: 12.5, padding: "2px 0" }}><CircleAlert size={13} color="var(--amber)" /> {x}</div>)}</>}
              {ai.narrative && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>{ai.narrative}</p>}
            </div>}
            {ai && ai.error && <div className="card" style={{ marginBottom: 13 }}><div className="muted" style={{ fontSize: 12.5 }}>AI deep review source unavailable - the deterministic examination above is complete and unaffected.</div></div>}

            {/* Gap analysis */}
            <div className="card" style={{ marginBottom: 13 }}><h3>Detailed gap analysis ({r.gaps.length})</h3>
              {r.gaps.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>No gaps detected - every control shows coverage. Confirm depth in an evidence review.</div> :
                <div className="tablewrap"><table>
                  <thead><tr><th>Ref</th><th>Domain</th><th>Expected control</th><th>Status</th><th>Risk</th><th>Regulatory basis</th><th>Recommended remediation</th></tr></thead>
                  <tbody>{r.gaps.map(c => (
                    <tr key={c.id}>
                      <td className="mono">{c.id}</td>
                      <td>{dn(c.domain)}</td>
                      <td style={{ minWidth: 220 }}>{c.expected}</td>
                      <td><span className="chip" style={{ background: (c.status === "missing" ? "#ef4444" : "#f59e0b") + "22", color: c.status === "missing" ? "#ef4444" : "#f59e0b" }}>{c.status === "missing" ? "Missing" : "Partial / weak"}</span></td>
                      <td><span className="chip" style={{ background: AML_RISKC[c.risk] + "22", color: AML_RISKC[c.risk] }}>{c.risk}</span></td>
                      <td className="muted" style={{ minWidth: 150 }}>{c.citation}</td>
                      <td style={{ minWidth: 220 }}>{c.remediation}</td>
                    </tr>
                  ))}</tbody>
                </table></div>}
            </div>

            {/* Enhancement recommendations */}
            {r.gaps.length > 0 && <div className="card"><h3>Enhancement recommendations ({r.gaps.length})</h3>
              <div className="grid" style={{ gap: 10 }}>
                {r.gaps.map(c => { const p = AML_PRIORITY(c.risk); const open = openRec[c.id]; return (
                  <div key={c.id} className="card" style={{ borderLeft: `3px solid ${AML_RISKC[c.risk]}`, padding: 13 }}>
                    <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <b style={{ fontSize: 13.5 }}>{c.id} - {c.requirement}</b>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="chip" style={{ background: p.c + "22", color: p.c }}>{p.t} priority</span>
                        <span className="chip" style={{ background: "#f5f6fb" }}>{c.complexity} effort</span>
                      </div>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, margin: "6px 0" }}><b>Reason:</b> {c.remediation}</div>
                    <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}><b>Risk mitigated:</b> {c.risk} - {dn(c.domain)} ({c.citation})</div>
                    <button className="btn ghost" style={{ padding: "3px 10px", fontSize: 11.5 }} onClick={() => setOpenRec(o => ({ ...o, [c.id]: !o[c.id] }))}>{open ? "Hide" : "Show"} suggested policy wording</button>
                    {open && <div style={{ marginTop: 8, background: "var(--brand50)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, fontStyle: "italic", color: "var(--text)" }}>"{c.suggestedWording}"</div>}
                  </div>
                ); })}
              </div>
            </div>}
          </>
        );
      })()}
    </>
  );
}

const THREAT_ATLAS = {"meta":{"name":"Mal MSB — Compliance Risk Typology Register","basis":"MSB_Compliance_Risk_Typology_Register.xlsx — internal working draft compiled to best knowledge, no live web access; every FATF rating, threshold, retention period and NRA finding is time-sensitive and marked [VERIFY] in the source. Incorporates the US 2026 Treasury NMLRA / NTFRA / NPFRA, Pakistan NRA 2023 and FATF/Egmont MSB typologies.","jurisdictions":["Bangladesh","Egypt","Indonesia","Malaysia","Morocco","Pakistan","Philippines","Singapore","Turkey","United Arab Emirates","United States"],"distribution":{"Critical":45,"High":27,"Medium":2,"Low":1},"headline":[["Fraud — IC3 2024","859,532 complaints, >$16B losses (+33% YoY)","2026 NMLRA"],["Pig-butchering / digital-asset scams","$5.8B (+47%), run from SE-Asia scam centres","2026 NMLRA"],["Investment fraud (overall)","$6.57B (IC3 2024, +44%)","2026 NMLRA"],["DPRK digital-asset heists","Bybit ~$1.5B (Feb 2025) — top PF threat","2026 NPFRA"],["Iran 'shadow banking' shells","~$4.2B moved (FinCEN Oct 2025)","2026 NPFRA"],["Hizballah financing","~$700M/yr (historical) via fronts & exchange houses","2026 NTFRA"]]},"typologies":[{"id":"1","jur":"Bangladesh","name":"Hawala / hundi informal remittance","cat":"ML/TF","type":"Jurisdiction-recognised","desc":"Value moved outside the formal banking channel via informal brokers; major risk given large diaspora.","flags":"Inbound/outbound flows with no corresponding bank settlement; customer references 'agent' for delivery; mismatched sender/receiver relationship; round-amount FX.","xb":true,"xbName":"Hawala / informal value transfer (IVTS)","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["OM-3","TM-1","TPO-4"]},{"id":"2","jur":"Bangladesh","name":"Trade-based ML (over/under-invoicing)","cat":"ML","type":"Jurisdiction-recognised","desc":"Mis-priced or phantom RMG/import-export trade used to move value.","flags":"Invoice value inconsistent with goods/market price; payments to third-party not on invoice; goods routed via high-risk transit.","xb":true,"xbName":"Trade-based money laundering","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-2","TM-1"]},{"id":"3","jur":"Bangladesh","name":"Inbound remittance layering","cat":"ML","type":"MSB-specific","desc":"Legitimate migrant-worker remittance corridors abused to inject illicit funds.","flags":"Remittance volume inconsistent with stated occupation; many senders to one beneficiary; rapid cash-out.","xb":true,"xbName":"Remittance-corridor abuse","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["CDD-2","EDD-1","OM-3","TM-1"]},{"id":"4","jur":"Bangladesh","name":"Mobile financial services structuring","cat":"ML","type":"Emerging/Fintech","desc":"bKash/Nagad-type wallets & agent networks used for smurfing.","flags":"Many small loads just under reporting/KYC tiers; rapid wallet-to-wallet hops; agent self-dealing.","xb":true,"xbName":"Cash structuring (smurfing)","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-1","TM-1"]},{"id":"5","jur":"Bangladesh","name":"NPO / charity abuse for TF","cat":"TF","type":"Jurisdiction-recognised","desc":"Charitable conduits used to raise/move funds for terrorism.","flags":"Donations routed to conflict regions; opaque beneficiaries; cash-intensive collections.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SANC-1","TM-1"]},{"id":"6","jur":"Bangladesh","name":"PEP / corruption proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Embezzlement and bribery proceeds laundered domestically and offshore.","flags":"Government-linked customer; wealth inconsistent with role; use of family nominees.","xb":true,"xbName":"Corruption & PEP proceeds","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","PEP-2"]},{"id":"7","jur":"Egypt","name":"Parallel-market FX / currency smuggling","cat":"ML","type":"Jurisdiction-recognised","desc":"Black-market currency dealing and cross-border cash given FX controls.","flags":"Demand for large cash FX; rates off official; structuring around FX limits.","xb":true,"xbName":"Cash structuring (smurfing)","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-2","TM-1"]},{"id":"8","jur":"Egypt","name":"Hawala informal transfer","cat":"ML/TF","type":"Jurisdiction-recognised","desc":"Informal value transfer bypassing banks.","flags":"No bank settlement leg; 'agent' delivery references.","xb":true,"xbName":"Hawala / informal value transfer (IVTS)","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["TM-1","TPO-4"]},{"id":"9","jur":"Egypt","name":"Trade-based ML","cat":"ML","type":"Jurisdiction-recognised","desc":"Mis-invoiced imports/exports.","flags":"Price/quantity mismatch; third-party payers; transit via high-risk ports.","xb":true,"xbName":"Trade-based money laundering","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-2","TM-1"]},{"id":"10","jur":"Egypt","name":"Remittance-corridor abuse","cat":"ML","type":"MSB-specific","desc":"Large worker-remittance inflows used to layer funds.","flags":"Sender/beneficiary mismatch; many-to-one patterns.","xb":true,"xbName":"Remittance-corridor abuse","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["OM-3","TM-1"]},{"id":"11","jur":"Egypt","name":"Antiquities / cultural-property proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Smuggled antiquities monetised through the system.","flags":"Dealings in cultural goods; cash settlement; vague provenance.","xb":false,"xbName":"","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","TM-1"]},{"id":"12","jur":"Egypt","name":"Regional terrorist financing","cat":"TF","type":"Jurisdiction-recognised","desc":"Funds raised/moved for regional terrorist activity.","flags":"Transfers to conflict-adjacent areas; cash collection networks.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SANC-1","TM-1"]},{"id":"13","jur":"Egypt","name":"Corruption / PEP proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Public-sector embezzlement laundered via nominees.","flags":"State-linked customers; unexplained wealth.","xb":true,"xbName":"Corruption & PEP proceeds","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","PEP-2"]},{"id":"14","jur":"Malaysia","name":"Cyber-enabled fraud & investment scams","cat":"ML","type":"Jurisdiction-recognised","desc":"Scam proceeds funnelled through mule accounts/wallets.","flags":"Rapid in-out; many unrelated payers; accounts opened then immediately funded & drained; device/IP anomalies.","xb":true,"xbName":"Cyber fraud, scams & money mules","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["DOB-3","TM-1"]},{"id":"15","jur":"Malaysia","name":"Illegal online gambling proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Unlicensed gambling settled through MSBs and e-wallets.","flags":"Frequent small credits from gaming-linked sources; payouts to many beneficiaries.","xb":true,"xbName":"Online / illegal gambling","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["TM-1","TM-4"]},{"id":"16","jur":"Malaysia","name":"Grand corruption (1MDB-type) layering","cat":"ML","type":"Jurisdiction-recognised","desc":"Misappropriated public funds layered via shells & offshore.","flags":"Complex layering; offshore SPVs; high-value assets.","xb":true,"xbName":"Shell companies / complex structures","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["CDD-2","EDD-1","EDD-2","PEP-2"]},{"id":"17","jur":"Malaysia","name":"Trade-based ML / free-zone abuse","cat":"ML","type":"Jurisdiction-recognised","desc":"Mis-invoicing and free-zone transit.","flags":"Price mismatch; circular trade; FTZ re-routing.","xb":true,"xbName":"Trade-based money laundering","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-2","TM-1"]},{"id":"18","jur":"Malaysia","name":"Drug-trafficking proceeds (regional transit)","cat":"ML","type":"Jurisdiction-recognised","desc":"Narcotics proceeds via cash & MSBs.","flags":"Cash-heavy; border-region nexus.","xb":false,"xbName":"","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SAR-1","TM-1"]},{"id":"19","jur":"Malaysia","name":"Real estate & luxury-goods laundering","cat":"ML","type":"MSB-specific","desc":"Proceeds parked in property/luxury assets.","flags":"Third-party funding; rapid resale; under/over-valuation.","xb":true,"xbName":"Real estate & high-value assets","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","TM-1"]},{"id":"20","jur":"Malaysia","name":"Cross-border worker remittance abuse","cat":"ML","type":"MSB-specific","desc":"Migrant corridors used for layering.","flags":"Sender/beneficiary mismatch; many-to-one.","xb":true,"xbName":"Remittance-corridor abuse","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["OM-3","TM-1"]},{"id":"21","jur":"Morocco","name":"Cash economy & structuring","cat":"ML","type":"Jurisdiction-recognised","desc":"Large informal cash economy enables smurfing.","flags":"Repeated sub-threshold cash; layered deposits.","xb":true,"xbName":"Cash structuring (smurfing)","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-1","TM-1"]},{"id":"22","jur":"Morocco","name":"Hawala-type informal transfer","cat":"ML/TF","type":"Jurisdiction-recognised","desc":"Informal value transfer networks.","flags":"No bank settlement; 'agent' delivery.","xb":true,"xbName":"Hawala / informal value transfer (IVTS)","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["TM-1","TPO-4"]},{"id":"23","jur":"Morocco","name":"Drug-trafficking (cannabis) proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Cannabis cultivation/export proceeds laundered.","flags":"Cash-heavy; northern-region nexus; rapid asset purchase.","xb":false,"xbName":"","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SAR-1","TM-1"]},{"id":"24","jur":"Morocco","name":"Smuggling / enclave-border trade","cat":"ML","type":"Jurisdiction-recognised","desc":"Contraband proceeds via border trade.","flags":"Goods/cash inconsistent with declared trade.","xb":true,"xbName":"Trade-based money laundering","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-2","TM-1"]},{"id":"25","jur":"Morocco","name":"Real estate & tourism laundering","cat":"ML","type":"MSB-specific","desc":"Proceeds invested in property/tourism developments.","flags":"Third-party funding; valuation anomalies.","xb":true,"xbName":"Real estate & high-value assets","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","TM-1"]},{"id":"26","jur":"Morocco","name":"Regional / Sahel terrorist financing","cat":"TF","type":"Jurisdiction-recognised","desc":"Funds for regional terrorist activity.","flags":"Transfers toward Sahel; cash collection.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SANC-1","TM-1"]},{"id":"27","jur":"Morocco","name":"Remittance-corridor abuse","cat":"ML","type":"MSB-specific","desc":"Diaspora remittances used to layer funds.","flags":"Sender/beneficiary mismatch.","xb":true,"xbName":"Remittance-corridor abuse","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["OM-3","TM-1"]},{"id":"28","jur":"Pakistan","name":"Hawala / hundi","cat":"ML/TF","type":"Jurisdiction-recognised","desc":"Dominant informal value-transfer system.","flags":"No bank leg; 'agent' settlement; FX-rate arbitrage.","xb":true,"xbName":"Hawala / informal value transfer (IVTS)","src":"Pakistan Summarized NRA 2023 (FMU / National FATF Secretariat) — confirmed; + APG MER","def":["TM-1","TPO-4"]},{"id":"29","jur":"Pakistan","name":"Terrorist financing","cat":"TF","type":"Jurisdiction-recognised","desc":"Heightened TF risk and supervisory focus.","flags":"Transfers to listed/conflict areas; charity conduits; cash collection.","xb":true,"xbName":"Terrorist / proliferation financing","src":"Pakistan Summarized NRA 2023 (FMU / National FATF Secretariat) — confirmed; + APG MER","def":["SANC-1","TM-1"]},{"id":"30","jur":"Pakistan","name":"Proliferation financing","cat":"PF","type":"Jurisdiction-recognised","desc":"Sanctions/PF-evasion exposure.","flags":"Dual-use goods trade; front companies; sanctioned-nexus counterparties.","xb":true,"xbName":"Terrorist / proliferation financing","src":"Pakistan Summarized NRA 2023 (FMU / National FATF Secretariat) — confirmed; + APG MER","def":["SANC-1","SANC-2"]},{"id":"31","jur":"Pakistan","name":"Trade-based ML / mis-invoicing","cat":"ML","type":"Jurisdiction-recognised","desc":"Mis-priced trade to move value.","flags":"Price/quantity mismatch; third-party payers.","xb":true,"xbName":"Trade-based money laundering","src":"Pakistan Summarized NRA 2023 (FMU / National FATF Secretariat) — confirmed; + APG MER","def":["REP-2","TM-1"]},{"id":"32","jur":"Pakistan","name":"Cash economy & structuring","cat":"ML","type":"Jurisdiction-recognised","desc":"Large undocumented cash economy.","flags":"Sub-threshold cash patterns.","xb":true,"xbName":"Cash structuring (smurfing)","src":"Pakistan Summarized NRA 2023 (FMU / National FATF Secretariat) — confirmed; + APG MER","def":["REP-1","TM-1"]},{"id":"33","jur":"Pakistan","name":"NPO / charity misuse","cat":"TF","type":"Jurisdiction-recognised","desc":"Charity conduits for TF.","flags":"Opaque beneficiaries; conflict-region disbursement.","xb":true,"xbName":"Terrorist / proliferation financing","src":"Pakistan Summarized NRA 2023 (FMU / National FATF Secretariat) — confirmed; + APG MER","def":["SANC-1","TM-1"]},{"id":"34","jur":"Pakistan","name":"Remittance-corridor abuse","cat":"ML","type":"MSB-specific","desc":"Large worker-remittance inflows layered.","flags":"Sender/beneficiary mismatch; many-to-one.","xb":true,"xbName":"Remittance-corridor abuse","src":"Pakistan Summarized NRA 2023 (FMU / National FATF Secretariat) — confirmed; + APG MER","def":["OM-3","TM-1"]},{"id":"35","jur":"Philippines","name":"Cyber fraud, romance & investment scams","cat":"ML","type":"Jurisdiction-recognised","desc":"Scam proceeds laundered via mules, wallets & remittance.","flags":"Rapid in-out; many unrelated payers; new account quickly drained.","xb":true,"xbName":"Cyber fraud, scams & money mules","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["DOB-3","TM-1"]},{"id":"36","jur":"Philippines","name":"Offshore/online gaming (POGO-type) proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Online-gaming operations used to launder & move value.","flags":"Gaming-linked counterparties; bulk payouts; foreign-worker payroll anomalies.","xb":true,"xbName":"Online / illegal gambling","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["TM-1","TM-4"]},{"id":"37","jur":"Philippines","name":"Casino-related laundering","cat":"ML","type":"Jurisdiction-recognised","desc":"Junket/casino channels layer funds.","flags":"Chip purchases with minimal play; third-party cash-out.","xb":true,"xbName":"Online / illegal gambling","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["TM-1","TM-4"]},{"id":"38","jur":"Philippines","name":"Drug-trafficking proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Narcotics proceeds via cash & MSBs.","flags":"Cash-heavy; structuring.","xb":false,"xbName":"","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SAR-1","TM-1"]},{"id":"39","jur":"Philippines","name":"OFW remittance abuse","cat":"ML","type":"MSB-specific","desc":"Overseas-worker remittance corridors layered.","flags":"Sender/beneficiary mismatch; many-to-one; rapid cash-out.","xb":true,"xbName":"Remittance-corridor abuse","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["OM-3","TM-1"]},{"id":"40","jur":"Philippines","name":"Corruption / plunder proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Public-fund misuse laundered via nominees.","flags":"State-linked customers; unexplained wealth.","xb":true,"xbName":"Corruption & PEP proceeds","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","PEP-2"]},{"id":"41","jur":"Philippines","name":"Human-trafficking proceeds","cat":"ML/Predicate","type":"Jurisdiction-recognised","desc":"Trafficking & exploitation proceeds.","flags":"Payments tied to recruitment fees; victim-linked accounts.","xb":false,"xbName":"","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SAR-1","TM-1"]},{"id":"42","jur":"Singapore","name":"Layering of foreign criminal proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Hub status exploited to layer offshore proceeds.","flags":"Foreign-sourced funds with weak economic rationale; rapid pass-through.","xb":true,"xbName":"Shell companies / complex structures","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["CDD-2","EDD-1"]},{"id":"43","jur":"Singapore","name":"Complex structures / shell & nominee arrangements","cat":"ML","type":"Jurisdiction-recognised","desc":"Opaque corporate layers obscure beneficial ownership.","flags":"Multiple SPVs; nominee directors; circular ownership.","xb":true,"xbName":"Shell companies / complex structures","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["CDD-2","EDD-1"]},{"id":"44","jur":"Singapore","name":"Foreign PEP & high-net-worth flows","cat":"ML","type":"Jurisdiction-recognised","desc":"Foreign PEP wealth routed through private banking/family offices.","flags":"PEP nexus; large unexplained inflows; reluctance to evidence source of wealth.","xb":true,"xbName":"Corruption & PEP proceeds","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","PEP-2"]},{"id":"45","jur":"Singapore","name":"Real estate & luxury-asset laundering","cat":"ML","type":"MSB-specific","desc":"High-value property/assets (cf. 2023 case).","flags":"Third-party/foreign funding; cash component; rapid purchase.","xb":true,"xbName":"Real estate & high-value assets","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","TM-1"]},{"id":"46","jur":"Singapore","name":"Trade-based ML / trade finance","cat":"ML","type":"Jurisdiction-recognised","desc":"Mis-invoicing through trade-finance hub.","flags":"Document/price mismatch; circular trade; round-tripping.","xb":true,"xbName":"Trade-based money laundering","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-2","TM-1"]},{"id":"47","jur":"Singapore","name":"Digital-payment-token / crypto flows","cat":"ML","type":"Emerging/Fintech","desc":"DPT/crypto used to move/layer value.","flags":"On/off-ramp bursts; unhosted-wallet exposure; chain-hopping.","xb":true,"xbName":"Virtual-asset / crypto layering","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SANC-1","TM-1"]},{"id":"48","jur":"Singapore","name":"Correspondent banking & sanctions evasion","cat":"ML/PF","type":"Jurisdiction-recognised","desc":"Cross-border nested relationships & evasion.","flags":"Nested/ shell correspondents; sanctioned-nexus routing.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SANC-1","SANC-2"]},{"id":"49","jur":"United Arab Emirates","name":"Trade-based ML (re-export hub)","cat":"ML","type":"Jurisdiction-recognised","desc":"Mis-invoicing & re-export trade move value.","flags":"Price/quantity mismatch; third-party payers; circular/transit trade.","xb":true,"xbName":"Trade-based money laundering","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["REP-2","TM-1"]},{"id":"50","jur":"United Arab Emirates","name":"Gold & precious-metals value transfer","cat":"ML","type":"Jurisdiction-recognised","desc":"Gold/DPMS used to store & move value.","flags":"Bullion settlement; cash-for-gold; weight/value mismatch.","xb":true,"xbName":"Gold & precious metals","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","TM-1"]},{"id":"51","jur":"United Arab Emirates","name":"Real estate laundering","cat":"ML","type":"MSB-specific","desc":"Property used to park proceeds.","flags":"Cash/third-party funding; rapid flip; under/over-valuation.","xb":true,"xbName":"Real estate & high-value assets","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","TM-1"]},{"id":"52","jur":"United Arab Emirates","name":"Free-zone & shell-company misuse","cat":"ML","type":"Jurisdiction-recognised","desc":"Free-zone entities obscure ownership/flows.","flags":"Opaque BO; no real substance; circular invoicing.","xb":true,"xbName":"Shell companies / complex structures","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["CDD-2","EDD-1","REP-2","TM-1"]},{"id":"53","jur":"United Arab Emirates","name":"Hawala & cash couriering","cat":"ML/TF","type":"Jurisdiction-recognised","desc":"Informal transfer & bulk-cash movement.","flags":"No bank leg; bulk cash; 'agent' settlement.","xb":true,"xbName":"Hawala / informal value transfer (IVTS)","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["TM-1","TPO-4"]},{"id":"54","jur":"United Arab Emirates","name":"Sanctions & proliferation-financing evasion","cat":"PF","type":"Jurisdiction-recognised","desc":"Front companies & dual-use trade evade sanctions.","flags":"Sanctioned-nexus counterparties; dual-use goods; rerouting.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["SANC-1","SANC-2"]},{"id":"55","jur":"United Arab Emirates","name":"Foreign PEP / illicit foreign proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Foreign PEP wealth routed in.","flags":"PEP nexus; unexplained foreign inflows.","xb":true,"xbName":"Corruption & PEP proceeds","src":"FATF/FSRB MER & follow-up; national NRA; regulator guidance","def":["EDD-2","PEP-2"]},{"id":"56","jur":"Turkey","name":"Sanctions evasion — Russia / Iran nexus","cat":"PF","type":"Jurisdiction-recognised","desc":"Turkey's geographic and trade position exploited for Russia and Iran sanctions evasion; dual-use goods and parallel-import schemes routed via Turkish intermediaries.","flags":"Dual-use goods routing; third-country re-export; front/shell companies; sanctioned-counterparty nexus; post-2022 volume spikes.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FATF Turkey MER; OFAC Russia sanctions advisories (2022-24); EU Russia sanctions guidance","def":["SANC-1","SANC-2"]},{"id":"57","jur":"Turkey","name":"Trade-based ML (Istanbul transit hub)","cat":"ML","type":"Jurisdiction-recognised","desc":"Istanbul's position as a major trade-transit hub used for mis-invoiced trade — gold, textiles and electronics predominate.","flags":"Price/quantity mismatch; circular trade; third-party payers; gold-settlement anomalies; high-risk counterparties.","xb":true,"xbName":"Trade-based money laundering","src":"FATF Turkey MER; APG TBML typologies","def":["REP-2","TM-1"]},{"id":"58","jur":"Turkey","name":"Hawala / informal exchange-office network","cat":"ML/TF","type":"Jurisdiction-recognised","desc":"Exchange houses and informal hawala networks used for value transfer, especially in diaspora and cross-border trade corridors.","flags":"No bank settlement leg; 'agent' delivery references; FX-rate arbitrage; customer references exchange-office settlement.","xb":true,"xbName":"Hawala / informal value transfer (IVTS)","src":"FATF Turkey MER; MASAK AML/CFT guidance","def":["TM-1","TPO-4"]},{"id":"59","jur":"Turkey","name":"Remittance-corridor abuse","cat":"ML","type":"MSB-specific","desc":"Diaspora remittance corridors (to/from Europe, Gulf, Central Asia) abused to layer funds.","flags":"Sender/beneficiary mismatch; many-to-one patterns; volume inconsistent with stated occupation; rapid cash-out.","xb":true,"xbName":"Remittance-corridor abuse","src":"FATF Turkey MER; MASAK annual report","def":["OM-3","TM-1"]},{"id":"60","jur":"Turkey","name":"Crypto / virtual-asset layering","cat":"ML","type":"Emerging/Fintech","desc":"High crypto adoption used for layering; on/off-ramp through Turkish exchanges and P2P markets.","flags":"Bursty on/off-ramp; chain-hopping; unhosted-wallet exposure; mismatch with customer profile.","xb":true,"xbName":"Virtual-asset / crypto layering","src":"FATF Turkey MER; BDDK/CMB crypto guidelines","def":["SANC-1","TM-1"]},{"id":"61","jur":"Turkey","name":"Corruption / PEP proceeds","cat":"ML","type":"Jurisdiction-recognised","desc":"Public-sector embezzlement and bribery proceeds laundered through nominee structures and real estate.","flags":"State/government-linked customer; wealth inconsistent with public role; nominee structures; real-estate purchase anomalies.","xb":true,"xbName":"Corruption & PEP proceeds","src":"FATF Turkey MER; Transparency International","def":["EDD-2","PEP-2"]},{"id":"62","jur":"Turkey","name":"NPO / charity misuse for TF","cat":"TF","type":"Jurisdiction-recognised","desc":"Non-profit organisations used as conduits for terrorist financing, particularly toward regional conflict zones.","flags":"Donations routed to conflict regions; opaque beneficiaries; cash-intensive collections; nexus to designated organisations.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FATF Turkey MER; MASAK AML/CFT guidance","def":["SANC-1","TM-1"]},{"id":"63","jur":"Indonesia","name":"Hawala / underground banking (fei-ch'ien)","cat":"ML/TF","type":"Jurisdiction-recognised","desc":"Underground banking and informal value-transfer networks serve the large unbanked population and diaspora corridors.","flags":"No bank settlement leg; 'agent' delivery; FX-rate arbitrage; customer references agent settlement.","xb":true,"xbName":"Hawala / informal value transfer (IVTS)","src":"FATF/APG Indonesia MER; PPATK annual report","def":["TM-1","TPO-4"]},{"id":"64","jur":"Indonesia","name":"Predicate crime proceeds (narcotics / illegal logging)","cat":"ML","type":"Jurisdiction-recognised","desc":"Proceeds from narcotics trafficking and illegal logging/mining laundered through cash-intensive businesses.","flags":"Cash-heavy deposits; business income inconsistent with declared activity; border/remote-region nexus; rapid asset acquisition.","xb":false,"xbName":"","src":"FATF/APG Indonesia MER; PPATK annual report","def":["SAR-1","TM-1"]},{"id":"65","jur":"Indonesia","name":"E-wallet / digital-payment fraud proceeds","cat":"ML","type":"Emerging/Fintech","desc":"Scam and fraud proceeds funnelled through the highly-penetrated e-wallet ecosystem (GoPay, OVO, Dana).","flags":"Rapid in-out; many unrelated payers; newly opened account quickly drained; device/IP anomalies; velocity inconsistent with profile.","xb":true,"xbName":"Cyber fraud, scams & money mules","src":"FATF/APG Indonesia MER; OJK fintech guidelines","def":["DOB-3","TM-1"]},{"id":"66","jur":"Indonesia","name":"TF / regional extremist financing (JI / IS-linked)","cat":"TF","type":"Jurisdiction-recognised","desc":"Elevated TF risk from domestic extremist networks with regional affiliations (JI, IS-aligned groups).","flags":"Transfers to conflict-adjacent regions; charity conduits; small structured collections; nexus to designated groups.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FATF/APG Indonesia MER; BNPT guidance","def":["SANC-1","TM-1"]},{"id":"67","jur":"Indonesia","name":"Crypto / virtual-asset layering","cat":"ML","type":"Emerging/Fintech","desc":"Growing crypto market used for layering; on/off-ramp through Indonesian exchanges and P2P platforms.","flags":"Bursty on/off-ramp; chain-hopping; unhosted-wallet exposure; profile mismatch.","xb":true,"xbName":"Virtual-asset / crypto layering","src":"FATF/APG Indonesia MER; OJK/Bappebti crypto regulation","def":["SANC-1","TM-1"]},{"id":"68","jur":"Indonesia","name":"OFW remittance-corridor abuse","cat":"ML","type":"MSB-specific","desc":"Overseas-worker remittance corridors (to/from Malaysia, Middle East, East Asia) abused to layer funds.","flags":"Sender/beneficiary mismatch; many-to-one patterns; inconsistent with stated occupation; rapid cash-out.","xb":true,"xbName":"Remittance-corridor abuse","src":"FATF/APG Indonesia MER; PPATK remittance guidance","def":["OM-3","TM-1"]},{"id":"69","jur":"United States","name":"Funnel accounts & structuring","cat":"ML","type":"Jurisdiction-recognised","desc":"Multiple individuals deposit cash into accounts controlled by one person to aggregate and transfer funds while evading CTR thresholds.","flags":"Many unrelated depositors to one account; sub-$10,000 cash structuring; rapid aggregation then wire; round-number deposits.","xb":true,"xbName":"Cash structuring (smurfing)","src":"FinCEN 2026 NMLRA; BSA/AML Examination Manual","def":["REP-1","TM-1"]},{"id":"70","jur":"United States","name":"Romance / pig-butchering scam proceeds","cat":"ML","type":"MSB-specific","desc":"Investment and romance scam proceeds laundered through MSBs, P2P payments, crypto and funnel accounts.","flags":"Inbound from many unrelated payers; account opened then quickly drained; victim-pattern flows; crypto bridging; inconsistent with customer profile.","xb":true,"xbName":"Cyber fraud, scams & money mules","src":"FinCEN 2026 NMLRA; FinCEN Online Pig-Butchering Alert (Sept 2023)","def":["DOB-3","TM-1","SAR-1"]},{"id":"71","jur":"United States","name":"Business email compromise (BEC) wire fraud","cat":"ML","type":"MSB-specific","desc":"BEC proceeds wired through domestic accounts and converted via MSBs, crypto or international transfers.","flags":"Sudden large wire from new counterparty; account recently opened; inconsistent with business pattern; multiple hop accounts.","xb":true,"xbName":"Cyber fraud, scams & money mules","src":"FinCEN 2026 NMLRA; FinCEN BEC Advisory (2016/2019)","def":["TM-1","SAR-1"]},{"id":"72","jur":"United States","name":"Digital asset / crypto layering & VASP exposure","cat":"ML","type":"Emerging/Fintech","desc":"Illicit funds layered via VASPs, mixers, chain-hopping and on/off-ramp services; DPRK, ransomware and scam-linked wallet exposure.","flags":"Frequent fiat↔crypto conversion; mixer/sanctioned-wallet exposure; chain-hopping; structuring around VASP limits; unhosted-wallet activity.","xb":true,"xbName":"Virtual-asset / crypto layering","src":"FinCEN 2026 NMLRA/NPFRA; OFAC Virtual Currency guidance (2021)","def":["SANC-1","TM-1","SAR-1"]},{"id":"73","jur":"United States","name":"Money mule networks","cat":"ML","type":"Jurisdiction-recognised","desc":"Recruited or complicit individuals receive and forward criminal proceeds, obscuring the trail across accounts.","flags":"Account funded by many unrelated parties then forwarded; profile inconsistent with volume; reluctance to explain; rapid in-out; job-offer linked.","xb":true,"xbName":"Cyber fraud, scams & money mules","src":"FinCEN 2026 NMLRA; FinCEN/INTERPOL Money Mule guidance","def":["DOB-3","TM-1","SAR-1"]},{"id":"74","jur":"United States","name":"Professional money laundering / CMLN","cat":"ML","type":"Jurisdiction-recognised","desc":"Criminal Money Laundering Networks (CMLNs) provide fee-based laundering services to multiple criminal organisations via complex webs of accounts.","flags":"Rapid pass-through across entities; no business rationale; multiple industries; professional enablers; circular fund movement.","xb":true,"xbName":"Shell companies / complex structures","src":"FinCEN 2026 NMLRA; FinCEN CMLN typology reports","def":["CDD-2","EDD-1","TM-1","SAR-1"]},{"id":"75","jur":"United States","name":"Sanctions & proliferation-financing evasion (DPRK / Iran / Russia)","cat":"PF","type":"Jurisdiction-recognised","desc":"DPRK cyber-theft proceeds, Iranian shadow banking, and Russia export-control evasion routed through US financial system via front companies and nested correspondents.","flags":"Sanctioned-nexus counterparties; dual-use goods routing; complex nested account chains; stated purpose inconsistent with counterparty profile.","xb":true,"xbName":"Terrorist / proliferation financing","src":"FinCEN 2026 NPFRA; OFAC advisories (DPRK 2019/2022/2025, Iran 2018/2025, Russia 2022-24)","def":["SANC-1","SANC-2","SAR-1"]}],"crossborder":[{"name":"Trade-based money laundering","jurs":"Bangladesh, Egypt, Malaysia, Morocco, Pakistan, Singapore, United Arab Emirates","why":"Mis-invoiced trade moves value across borders through transit hubs (Singapore, UAE) into and out of manufacturing/import economies.","flags":"Invoice price/quantity inconsistent with market; third-party (non-invoice) payers; circular or transit trade; round-tripping."},{"name":"Remittance-corridor abuse","jurs":"Bangladesh, Egypt, Malaysia, Morocco, Pakistan, Philippines","why":"Migrant-worker corridors connect sending hubs (UAE, Singapore, Malaysia) with receiving economies (Bangladesh, Pakistan, Philippines, Egypt, Morocco).","flags":"Remittance volume inconsistent with stated occupation; many senders to one beneficiary; rapid cash-out; new corridor with no profile."},{"name":"Terrorist / proliferation financing","jurs":"Bangladesh, Egypt, Morocco, Pakistan, Singapore, United Arab Emirates","why":"Funds are raised and moved toward conflict-adjacent regions; charity conduits and cash collection cross borders.","flags":"Transfers toward listed/conflict regions; charity conduits; small structured collections; sanctioned-nexus counterparties."},{"name":"Corruption & PEP proceeds","jurs":"Bangladesh, Egypt, Philippines, Singapore, United Arab Emirates","why":"Foreign PEP and corruption proceeds are routed into hub markets (UAE, Singapore) from across the region.","flags":"PEP or state-linked nexus; unexplained wealth/inflows; use of family nominees; reluctance to evidence source of wealth."},{"name":"Hawala / informal value transfer (IVTS)","jurs":"Bangladesh, Egypt, Morocco, Pakistan, United Arab Emirates","why":"Informal value-transfer networks span sender and receiver countries with no settling bank leg; corridors interconnect South Asia, MENA and the Gulf.","flags":"No corresponding bank settlement; 'agent will deliver' references; mismatched sender/receiver; round-amount FX; corridor concentration."},{"name":"Cash structuring (smurfing)","jurs":"Bangladesh, Egypt, Morocco, Pakistan","why":"Bulk cash and structuring feed into informal corridors and are carried across borders.","flags":"Repeated sub-threshold cash; multiple branches/agents; rapid aggregation then transfer."},{"name":"Real estate & high-value assets","jurs":"Malaysia, Morocco, Singapore, United Arab Emirates","why":"Proceeds are parked in property/luxury assets in hub markets (UAE, Singapore, Malaysia) regardless of origin.","flags":"Third-party/foreign funding; cash component; rapid purchase/resale; under- or over-valuation."},{"name":"Shell companies / complex structures","jurs":"Malaysia, Singapore, United Arab Emirates","why":"Opaque structures and free-zone/offshore entities layer proceeds across multiple jurisdictions.","flags":"Multiple SPVs; nominee directors; circular ownership; free-zone entity with no substance; opaque beneficial owner."},{"name":"Cyber fraud, scams & money mules","jurs":"Malaysia, Philippines","why":"Scam syndicates operate across borders; mule networks and wallets move proceeds between jurisdictions rapidly.","flags":"Account funded then immediately drained; many unrelated payers; device/IP anomalies; victim-pattern inbound credits."},{"name":"Online / illegal gambling","jurs":"Malaysia, Philippines","why":"Online/illegal gaming operations and payouts cross borders (notably Philippines and Malaysia).","flags":"Gaming-linked counterparties; bulk payouts to many beneficiaries; chip purchase with minimal play."},{"name":"Gold & precious metals","jurs":"United Arab Emirates","why":"Gold/DPMS store and move value across the Gulf and Asian trade routes.","flags":"Bullion/cash-for-gold settlement; weight/value mismatch; rapid resale."},{"name":"Virtual-asset / crypto layering","jurs":"Singapore","why":"Virtual assets are inherently cross-border; layering and off-ramping move between regulated (Singapore, UAE, Malaysia, Philippines) and restricted markets.","flags":"Bursty on/off-ramp activity; unhosted-wallet exposure; chain-hopping; mismatch with customer profile; travel-rule gaps."}],"segments":[{"seg":"Licensed professionals","typ":"Gatekeeper / professional facilitation & client-fund commingling","method":"Practice or client accounts used to move or layer third-party funds.","flags":"Client/pooled-account flows inconsistent with the practice; third-party funds passing through; payments unrelated to the profession.","L":"2.0","I":"4.0","score":8,"rating":"Medium"},{"seg":"Licensed professionals","typ":"Tax-evasion / unexplained-wealth layering","method":"Undeclared income routed through professional accounts.","flags":"Income inconsistent with declared profession; structured cash; offshore movement.","L":"2.0","I":"3.0","score":6,"rating":"Medium"},{"seg":"Remote workers","typ":"Money-mule recruitment via fake remote roles","method":"‘Job’ requires receiving and forwarding funds, masking origin.","flags":"Inbound from many unrelated payers then forwarded; employer/geography mismatch; rapid in-out; reluctance to explain.","L":"3.0","I":"3.0","score":9,"rating":"High"},{"seg":"Remote workers","typ":"Third-party-funded pass-through","method":"Account funded by parties unrelated to stated employment.","flags":"Funder ≠ stated employer; salary pattern absent; sudden volume change.","L":"3.0","I":"2.0","score":6,"rating":"Medium"},{"seg":"Migrant workers","typ":"Funnel / many-to-one remittance & account sharing","method":"One account used to receive and remit on behalf of many.","flags":"One account receiving for many senders; remittances exceeding wages; third-party control of the account; coercion signs.","L":"3.0","I":"3.0","score":9,"rating":"High"},{"seg":"Migrant workers","typ":"Hawala / IVTS interface & labour-exploitation proceeds","method":"Account interfaces with informal value transfer or holds trafficking/exploitation proceeds.","flags":"No bank settlement leg; corridor concentration; recruitment-fee-linked flows; account controlled by a third party.","L":"3.0","I":"3.0","score":9,"rating":"High"},{"seg":"Freelancers","typ":"Fake / inflated service invoicing (value transfer)","method":"Invoices without real deliverables used to move value.","flags":"Invoices with no evidence of work; round-sum recurring from unrelated parties; income inconsistent with history; rapid withdrawal.","L":"3.0","I":"3.0","score":9,"rating":"High"},{"seg":"Freelancers","typ":"Mule / rapid pass-through","method":"Account used to receive and forward third-party funds.","flags":"Inbound then immediate outbound; unrelated payers; profile mismatch.","L":"3.0","I":"2.0","score":6,"rating":"Medium"},{"seg":"Employed (salaried)","typ":"Mule pass-through / structuring of unexplained side-inflows","method":"Salaried account used for unrelated third-party throughput.","flags":"Salary credits plus unexplained third-party inflows; sudden volume change; forwarding behaviour.","L":"2.0","I":"3.0","score":6,"rating":"Medium"},{"seg":"Platform-based earners (Upwork/Fiverr/Toptal)","typ":"Collusive / fake-gig self-laundering via platform payouts","method":"Self-dealing or collusive buyer-seller gigs used to legitimise funds.","flags":"Platform payouts inconsistent with account history; circular payments; clients in high-risk jurisdictions; rapid cash-out / crypto off-ramp.","L":"3.0","I":"3.0","score":9,"rating":"High"},{"seg":"Platform-based earners (Upwork/Fiverr/Toptal)","typ":"Sanctions-nexus client payments","method":"Payments from clients in sanctioned / high-risk locations.","flags":"Counterparties in sanctioned or high-risk jurisdictions; IP/geo mismatch; payment routing anomalies.","L":"2.0","I":"4.0","score":8,"rating":"Medium"},{"seg":"Self-employed / sole traders","typ":"Cash-intensive business layering & commingling","method":"Personal and business funds mixed to obscure illicit cash.","flags":"Cash deposits inconsistent with the business; round-number patterns; third-party funding; rapid movement out.","L":"3.0","I":"3.0","score":9,"rating":"High"},{"seg":"Self-employed / sole traders","typ":"Trade mis-invoicing (goods/services)","method":"Over/under-invoicing used to move value across borders.","flags":"Invoice value vs goods/market mismatch; third-party payers; high-risk counterparties.","L":"2.0","I":"4.0","score":8,"rating":"Medium"},{"seg":"Retired and students","typ":"Mule recruitment / account rental (vulnerable-group targeting)","method":"Vulnerable customers recruited to receive/forward funds or rent accounts.","flags":"Activity inconsistent with pension/student profile; sudden high-volume throughput; third-party control; inbound from unrelated parties then forwarded.","L":"3.0","I":"3.0","score":9,"rating":"High"},{"seg":"Crypto users","typ":"Virtual-asset on/off-ramp layering & illicit-wallet exposure","method":"Fiat↔crypto conversion used to layer; exposure to mixers / high-risk VASPs.","flags":"Frequent fiat↔crypto conversion; exposure to mixers / sanctioned wallets; chain-hopping; structuring around VASP limits.","L":"4.0","I":"4.0","score":16,"rating":"Critical"},{"seg":"Crypto users","typ":"Scam / ransomware proceeds & sanctions-nexus wallets","method":"Crypto channels used to move fraud/ransomware proceeds or evade sanctions.","flags":"Inbound from scam/ransomware-linked addresses; sanctioned-wallet exposure; bursty on/off-ramp; victim-pattern flows.","L":"3.0","I":"4.0","score":12,"rating":"High"}],"corridors":[{"corridor":"US → Bangladesh","profile":"Large diaspora & migrant-worker remittance corridor; cash-out heavy at agents.","typ":"Hundi/hawala diversion of formal remittance; trade-based ML (RMG/import-export); inbound-remittance layering; NPO/charity TF; MFS (bKash/Nagad) structuring.","flags":"Sender income inconsistent with volume; many senders → one beneficiary; rapid agent cash-out; payments linked to garment trade; beneficiary near conflict/charity nexus.","actors":"Hundi/hawala networks; trade mis-invoicing rings; labour-recruitment fraud; charity-linked TF.","adv":"FATF, ‘Role of Hawala & Other Similar Service Providers’ (2013); FinCEN Human Trafficking advisory (2014/2020…","L":"4.0","I":"4.0","score":16,"rating":"Critical","ids":"1-6 (Bangladesh)"},{"corridor":"US → Egypt","profile":"Diaspora remittance into a cash-heavy, FX-controlled economy.","typ":"Parallel-market FX / currency smuggling; hawala settlement; structuring to evade FX limits; trade-based ML.","flags":"Pressure to convert to USD cash; sender/beneficiary mismatch; transfers timed to FX-rate gaps; rapid cash withdrawal.","actors":"Hawala / parallel-FX dealers; trade mis-invoicing; (rarely) antiquities proceeds.","adv":"FATF, ‘Role of Hawala...’ (2013); MENAFATF Egypt MER; FinCEN BEC advisory (2016/2019).","L":"3.0","I":"4.0","score":12,"rating":"High","ids":"7-13 (Egypt)"},{"corridor":"US → Malaysia","profile":"Transit & scam-syndicate hub in SE Asia; growing e-wallet/crypto use.","typ":"Cyber-scam proceeds (pig-butchering/romance/investment) via mules; online-gambling settlement; virtual-asset on/off-ramp layering; TBML / free-zone.","flags":"Inbound to newly-opened mule accounts then onward; links to scam-compound regions; crypto bridging; gaming-linked counterparties.","actors":"SE-Asian cyber-scam syndicates (often using trafficked labour); illegal online gambling; drug-transit launderers.","adv":"FinCEN ‘pig-butchering’/online-scam Alert (Sept 2023); FinCEN Ransomware/CVC advisory (2020/2021); FinCEN Hum…","L":"4.0","I":"4.0","score":16,"rating":"Critical","ids":"14-20 (Malaysia)"},{"corridor":"US → Morocco","profile":"Diaspora remittance; cash economy; Sahel TF adjacency.","typ":"Hawala-type informal transfer; cash structuring; drug (cannabis) proceeds; regional/Sahel TF; real-estate placement.","flags":"Sender mismatch; cash-out near border regions; transfers to high-risk adjacency; rapid property-linked payouts.","actors":"Hawala networks; cannabis-trafficking launderers; smuggling rings.","adv":"FATF, ‘Role of Hawala...’ (2013); MENAFATF Morocco MER; FATF ‘Emerging Terrorist Financing Risks’ (2015).","L":"3.0","I":"4.0","score":12,"rating":"High","ids":"21-27 (Morocco)"},{"corridor":"US → Pakistan","profile":"One of the largest global remittance corridors; hawala/hundi dominant; elevated TF/PF.","typ":"Hundi/hawala diversion; terrorist financing to designated groups; proliferation-financing nexus; charity/NPO abuse; TBML.","flags":"Many senders → one beneficiary; charity-linked transfers; sends to high-risk regions; hundi (no settlement leg); sanctioned-nexus counterparties.","actors":"Hundi networks; designated-group TF facilitators; PF front companies; smuggling/TBML rings.","adv":"FATF, ‘Role of Hawala...’ (2013); FATF Pakistan MER & action-plan history; FinCEN/OFAC sanctions-screening ex…","L":"4.0","I":"5.0","score":20,"rating":"Critical","ids":"28-34 (Pakistan)"},{"corridor":"US → Philippines","profile":"Huge OFW remittance corridor; scam-syndicate & online-gaming exposure.","typ":"OFW-remittance pattern abuse; cyber-scam (pig-butchering/romance) mule layering; POGO/online-gaming settlement; casino-linked ML; human-trafficking proceeds.","flags":"Many-to-one beneficiary patterns abused; victim-pattern inbound then rapid cash-out; gaming-linked credits; new accounts drained quickly.","actors":"Cyber-scam syndicates; POGO-linked launderers; casino junket networks; trafficking rings.","adv":"FinCEN ‘pig-butchering’/online-scam Alert (Sept 2023); FinCEN Human Trafficking advisory (2014/2020); FinCEN…","L":"5.0","I":"4.0","score":20,"rating":"Critical","ids":"35-41 (Philippines)"},{"corridor":"US → Singapore","profile":"Major financial hub / pass-through point; high-value & crypto exposure.","typ":"Layering of foreign proceeds; shell / complex-structure pass-through; high-value-asset & property placement; virtual-asset flows; sanctions/PF transit.","flags":"Pass-through with no economic rationale; complex/nominee structures; foreign-PEP inflows; immediate onward high-value transfer.","actors":"Foreign-proceeds layering networks; sanctions/PF transit facilitators; professional enablers.","adv":"FATF Singapore MER; FinCEN/OFAC Iran (2018) & DPRK (2017) illicit-finance advisories; Russia export-control e…","L":"3.0","I":"4.0","score":12,"rating":"High","ids":"42-48 (Singapore)"},{"corridor":"US → UAE","profile":"Major re-export / trade & gold hub; hawala & sanctions-evasion exposure.","typ":"Trade-based ML (re-export); gold/precious-metals value transfer; real-estate placement; free-zone shell misuse; hawala; sanctions/PF evasion (onward to Iran).","flags":"Onward transfer to higher-risk jurisdictions; gold/trade settlement; free-zone entity with no substance; sanctioned-nexus or dual-use goods.","actors":"TBML & gold-laundering rings; sanctions-evasion / re-export facilitators; hawala networks.","adv":"FATF UAE MER & grey-list history; FinCEN/OFAC Iran illicit-finance advisory (2018); Russia export-control eva…","L":"4.0","I":"5.0","score":20,"rating":"Critical","ids":"49-55 (UAE)"},{"corridor":"UAE → Pakistan","profile":"Top-tier real-world remittance & hawala corridor; very high TF/hawala density.","typ":"Hawala/hundi settlement; TF to high-risk regions; TBML/gold; bulk-cash & re-export linkage.","flags":"No bank settlement leg; many-to-one; charity/high-risk-region nexus; gold/trade settlement.","actors":"Hawala networks; TF facilitators; TBML/gold rings.","adv":"FATF, ‘Role of Hawala...’ (2013); FATF Pakistan & UAE MERs; FATF ‘Emerging TF Risks’ (2015).","L":"5.0","I":"5.0","score":25,"rating":"Critical","ids":"28-34 (Pakistan)"},{"corridor":"UAE → Bangladesh","profile":"Large Gulf→South-Asia remittance & hawala corridor.","typ":"Hawala diversion; TBML (RMG); inbound-remittance layering; labour-migration fraud nexus.","flags":"Sender mismatch; many-to-one; rapid cash-out; trade-linked payments.","actors":"Hawala networks; trade mis-invoicing; recruitment-fraud rings.","adv":"FATF, ‘Role of Hawala...’ (2013); FATF–Egmont TBML (2020); FinCEN Human Trafficking advisory.","L":"4.0","I":"4.0","score":16,"rating":"Critical","ids":"1-6 (Bangladesh)"},{"corridor":"Singapore / Malaysia → Philippines","profile":"Intra-SEA remittance & scam-proceeds corridor.","typ":"Cyber-scam mule layering; online-gaming/POGO settlement; OFW-pattern abuse; crypto bridging.","flags":"Mule-account inbound then onward; gaming-linked; victim-pattern flows; crypto on/off-ramp.","actors":"Cyber-scam syndicates; POGO launderers; trafficking rings.","adv":"FinCEN ‘pig-butchering’ Alert (Sept 2023); FinCEN Ransomware/CVC advisory; APG Philippines MER.","L":"4.0","I":"4.0","score":16,"rating":"Critical","ids":"35-41 (Philippines)"},{"corridor":"UAE → Egypt / Morocco","profile":"Gulf→North-Africa remittance & hawala corridor.","typ":"Hawala settlement; parallel-FX (Egypt); cash structuring; trade-based ML.","flags":"FX-gap timing; cash-out; sender mismatch; trade-linked settlement.","actors":"Hawala / parallel-FX dealers; TBML rings.","adv":"FATF, ‘Role of Hawala...’ (2013); MENAFATF Egypt & Morocco MERs.","L":"3.0","I":"4.0","score":12,"rating":"High","ids":"7-13 (Egypt) & 21-27 (Morocco)"},{"corridor":"US → Turkey","profile":"Diaspora remittance and trade corridor; elevated sanctions-evasion and crypto-layering risk post-2022 (Russia / Iran nexus).","typ":"Hawala / exchange-office networks; sanctions evasion (Russia/Iran dual-use goods); trade-based ML (Istanbul transit); crypto / virtual-asset layering; remittance-corridor abuse.","flags":"Onward transfer toward sanctioned jurisdictions; dual-use goods routing; exchange-office settlement with no bank leg; crypto on/off-ramp bursts; sender/beneficiary mismatch.","actors":"Exchange-house networks; sanctions-evasion facilitators; TBML rings; crypto-layering services.","adv":"OFAC Russia sanctions advisories (2022-24); FATF Turkey MER; FinCEN/OFAC Iran illicit-finance advisory (2018/2025).","L":"3.0","I":"5.0","score":15,"rating":"Critical","ids":"56-62 (Turkey)"},{"corridor":"US → Indonesia","profile":"OFW / diaspora remittance corridor; fast-growing e-wallet and crypto ecosystem; TF adjacency (JI/IS-linked networks).","typ":"OFW remittance-corridor abuse; e-wallet / digital-payment fraud proceeds (GoPay/OVO/Dana); underground banking; TF (JI/IS-linked); crypto layering.","flags":"Sender/beneficiary mismatch; e-wallet layering patterns; many-to-one inbound; TF-nexus transfers; crypto bridging.","actors":"Underground banking networks; OFW-remittance abuse rings; e-wallet fraud syndicates; extremist financing facilitators.","adv":"FATF/APG Indonesia MER; FinCEN human-trafficking advisory (2014/2020); FinCEN pig-butchering Alert (Sept 2023).","L":"3.0","I":"4.0","score":12,"rating":"High","ids":"63-68 (Indonesia)"}],"jurProfiles":[{"jur":"Bangladesh","reg":"Bangladesh Bank (central bank / AML-CFT supervisor)","fiu":"Bangladesh Financial Intelligence Unit (BFIU) – goAML","fw":"Money Laundering Prevention Act 2012 (amended); Anti-Terrorism Act 2009; BFIU AML/CFT Guidelines & Master Circular","body":"APG (Asia/Pacific Group)","fatf":"Assessed by APG (3rd-round MER ~2016 + follow-ups). Not on the FATF increased-monitoring list per last knowledge. [VERIFY current MER ratings & follow-up status]","defi":"Common themes: use of financial intelligence & ML prosecution outcomes; TBML detection; NPO/charity oversight; beneficial-ownership transparency. [VERIFY against published MER]","thr":"CTR to BFIU at/above BDT 1,000,000 single cash txn; STR any amount. [VERIFY]","ret":"≥ 5 years [VERIFY]"},{"jur":"Egypt","reg":"Central Bank of Egypt (CBE)","fiu":"Egyptian Money Laundering & Terrorist Financing Combating Unit (EMLCU)","fw":"Anti-Money Laundering Law No. 80 of 2002 (amended) & Executive Regulations; EMLCU instructions","body":"MENAFATF","fatf":"Assessed by MENAFATF (MER ~2021). Not on the increased-monitoring list per last knowledge. [VERIFY]","defi":"Themes: risk-based supervision (esp. DNFBPs); beneficial ownership; ML investigation/prosecution effectiveness; TF. [VERIFY against MER]","thr":"Suspicion-based STR to EMLCU; CDD threshold for occasional txns per Executive Regs. [VERIFY]","ret":"≥ 5 years [VERIFY]"},{"jur":"Malaysia","reg":"Bank Negara Malaysia (BNM)","fiu":"Financial Intelligence & Enforcement Department (FIED), BNM","fw":"AMLA 2001 (Anti-Money Laundering, Anti-Terrorism Financing & Proceeds of Unlawful Activities Act); BNM AML/CFT/CPF poli…","body":"FATF & APG","fatf":"FATF member; 4th-round MER 2015 + follow-ups; generally moderate-to-substantial effectiveness. [VERIFY ratings & latest follow-up]","defi":"Themes: DNFBP supervision; beneficial ownership; ML conviction outcomes. [VERIFY against MER]","thr":"CTR at/above RM 25,000 cash; STR any amount. [VERIFY]","ret":"≥ 6 years [VERIFY]"},{"jur":"Morocco","reg":"Bank Al-Maghrib (central bank)","fiu":"Autorité Nationale du Renseignement Financier (ANRF, formerly UTRF)","fw":"Law No. 43-05 on AML (amended, incl. Law 12-18); Penal Code provisions; ANRF instructions","body":"MENAFATF","fatf":"On FATF increased-monitoring list Feb 2021; removed Feb 2023. [VERIFY post-exit follow-up status]","defi":"Action-plan themes (now addressed per exit): risk-based supervision; beneficial ownership; TF & targeted sanctions; effectiveness of investigations. [VERIFY]","thr":"Suspicion-based déclaration de soupçon to ANRF; CDD threshold for occasional txns. [VERIFY]","ret":"Commonly cited up to 10 years [VERIFY exact period]"},{"jur":"Pakistan","reg":"State Bank of Pakistan (SBP) [banks, MFBs, ECs, DFIs]; SECP [securities, NBFCs, insurance…","fiu":"Financial Monitoring Unit (FMU) – goAML","fw":"Anti-Money Laundering Act 2010 (amended); Anti-Terrorism Act 1997; SBP AML/CFT/CPF Regulations","body":"APG","fatf":"3rd National Risk Assessment completed 2023 (after 2017 & 2019). On the FATF increased-monitoring (grey) list June 2018 – exited Oct 2022 after completing two action plans. Source: Pakistan Summarize…","defi":"Per NRA 2023, highest ML threats (Very High): corruption/bribery, illegal MVTS (hawala/hundi), tax crimes, smuggling & cash smuggling. Most-vulnerable sectors: banks, real-estate agents, exchange companies, DPMS; Privat…","thr":"CTR at/above PKR 2,000,000 single cash txn; STR any amount. [VERIFY]","ret":"≥ 5 years [VERIFY]"},{"jur":"Philippines","reg":"Bangko Sentral ng Pilipinas (BSP)","fiu":"Anti-Money Laundering Council (AMLC)","fw":"Anti-Money Laundering Act 2001 (RA 9160, amended by RA 10365 / RA 11521); Terrorism Financing Prevention & Suppression…","body":"APG","fatf":"Added to FATF grey list Jun 2021; best knowledge indicates removal ~Feb 2025 – [VERIFY HARD: confirm current status, time-sensitive]","defi":"Action-plan themes: casino/DNFBP & MVTS supervision; beneficial ownership; TF investigation/prosecution; targeted financial sanctions; cross-border/remittance controls. [VERIFY]","thr":"CTR for single cash/equivalent txn > PHP 500,000 in one banking day; STR any amount. [VERIFY]","ret":"≥ 5 years [VERIFY]"},{"jur":"Singapore","reg":"Monetary Authority of Singapore (MAS)","fiu":"Suspicious Transaction Reporting Office (STRO), Commercial Affairs Department, SPF – SONAR","fw":"CDSA 1992 (Corruption, Drug Trafficking & Other Serious Crimes); TSOFA 2002; MAS Notice 626 (banks); PS Act 2019 (payme…","body":"FATF","fatf":"FATF member; MER 2016 – strong overall effectiveness. Not listed. Post-2023 ~S$3bn ML case heightened scrutiny of wealth/property/family-office channels. [VERIFY ratings & latest follow-up]","defi":"Historic improvement areas: DNFBP supervision; legal persons / beneficial-ownership transparency. Risk arises mainly from scale & cross-border exposure, not weak controls. [VERIFY]","thr":"Suspicion-based STR (CDSA); no routine domestic CTR threshold; cross-border physical currency/bearer instruments ≥ SGD…","ret":"≥ 5 years [VERIFY]"},{"jur":"United Arab Emirates","reg":"Central Bank of the UAE (CBUAE); DFSA (DIFC); FSRA (ADGM)","fiu":"UAE FIU / Anti-Money Laundering & Suspicious Cases Unit (AMLSCU) – goAML","fw":"Federal Decree-Law No. 20 of 2018 (amended by Decree-Law 26 of 2021); Cabinet Decision No. 10 of 2019; CBUAE AML/CFT re…","body":"MENAFATF / FATF","fatf":"MER 2020; on FATF grey list Mar 2022; removed Feb 2024 after action plan. [VERIFY post-exit follow-up status]","defi":"Action-plan themes (per exit): beneficial ownership; MVTS/hawala registration & supervision; targeted financial sanctions; ML investigation/prosecution; international cooperation. [VERIFY]","thr":"Suspicion-based STR/SAR via goAML; CDD threshold for occasional txns commonly stated AED 55,000 (~USD 15,000). [VERIFY]","ret":"≥ 5 years [VERIFY]"},{"jur":"Turkey","reg":"Banking Regulation and Supervision Agency (BDDK); Capital Markets Board (CMB / SPK)","fiu":"Financial Crimes Investigation Board (MASAK — Mali Suçları Araştırma Kurulu)","fw":"Law No. 5549 on Prevention of Laundering Proceeds of Crime; Law No. 6415 on Prevention of Financing of Terrorism; MASAK Regulations on obliged parties","body":"FATF","fatf":"FATF member; MER 2019. Not on the increased-monitoring list per last knowledge. Ongoing review of sanctions-evasion exposure post-2022 (Russia/Iran corridors). [VERIFY current MER ratings & follow-up status]","defi":"Themes (per MER and follow-up): DNFBP supervision; beneficial ownership; effectiveness of ML/TF investigations and prosecutions; NPO oversight; virtual-asset regulation. [VERIFY against MER]","thr":"Suspicion-based STR/SAR to MASAK; transaction reporting for cash above TRY threshold (currently TRY 75,000 — [VERIFY]). Enhanced obligations for obliged parties re: PEP and high-risk countries.","ret":"≥ 8 years [VERIFY]"},{"jur":"Indonesia","reg":"Otoritas Jasa Keuangan (OJK — Financial Services Authority); Bank Indonesia (BI) for payment systems","fiu":"Pusat Pelaporan dan Analisis Transaksi Keuangan (PPATK — Indonesian Financial Transaction Reports and Analysis Centre)","fw":"Law No. 8 of 2010 on Money Laundering; Law No. 9 of 2013 on Prevention and Eradication of Terrorism Financing; OJK / BI AML/CFT regulations; PPATK guidance","body":"APG","fatf":"Assessed by APG (MER 2018). Placed on FATF grey list Oct 2018; removed Jun 2023 after completing FATF action plan. [VERIFY post-exit follow-up status]","defi":"Action-plan themes (addressed per exit): risk-based supervision (DNFBP & MVTS); beneficial ownership; TF investigation and prosecution; targeted financial sanctions implementation; cross-border remittance controls. [VERIFY against post-exit follow-up]","thr":"CTR for cash transactions above IDR 500,000,000 (~USD 30,000); STR for any suspicious transaction regardless of amount. [VERIFY current thresholds]","ret":"≥ 5 years [VERIFY]"},{"jur":"United States","reg":"FinCEN (BSA administrator); Federal Reserve; OCC; FDIC; NCUA; SEC; CFTC; state money-transmitter regulators (e.g. NYDFS)","fiu":"FinCEN — BSA E-Filing System (SARs, CTRs, CMIRs, FBARs, DOEP)","fw":"Bank Secrecy Act (BSA) 1970 as amended; USA PATRIOT Act 2001; AML Act 2020; FinCEN regulations (31 CFR Chapter X); OFAC sanctions programmes; Corporate Transparency Act (CTA) 2024","body":"FATF","fatf":"FATF member; MER 2016 + follow-ups; 4th-round MER in progress. [VERIFY] Generally strong technical compliance; effectiveness gaps noted in DNFBP coverage (real estate, attorneys), beneficial-ownership (CTA implementation), and virtual-asset/VASP supervision. [VERIFY]","defi":"Key themes (per 2016 MER, AML Act 2020 and 2026 NRA cycle): DNFBP / gatekeeper AML coverage; real-estate sector AML; beneficial ownership (CTA rollout); virtual-asset supervision; MSB de-risking; correspondent banking; BaaS / third-party programme oversight.","thr":"CTR: cash ≥ $10,000 in one business day. SAR: suspicion ≥ $5,000 (banks / MSBs). CMIR: cross-border physical currency / monetary instruments ≥ $10,000. [VERIFY current thresholds and MSB-specific obligations]","ret":"5 years for BSA records; 7 years for SARs [VERIFY]"}],"usThreats":{"NMLRA":[{"area":"Fraud (overall)","score":20,"rating":"Critical"},{"area":"Investment fraud (incl. digital-asset “pig-butcheri…","score":20,"rating":"Critical"},{"area":"Confidence scams (BEC, impersonation, romance, adva…","score":16,"rating":"Critical"},{"area":"Elder financial exploitation","score":16,"rating":"Critical"},{"area":"Use of AI in fraud / deepfakes","score":16,"rating":"Critical"},{"area":"Check fraud (update)","score":9,"rating":"High"},{"area":"Drug trafficking","score":20,"rating":"Critical"},{"area":"Cybercrime (identity theft, ransomware, sextortion)","score":16,"rating":"Critical"},{"area":"Professional money laundering / CMLNs","score":20,"rating":"Critical"},{"area":"Money mules","score":20,"rating":"Critical"},{"area":"Human trafficking & smuggling","score":16,"rating":"Critical"},{"area":"Corruption (domestic & foreign)","score":12,"rating":"High"},{"area":"Illicit trade","score":12,"rating":"High"},{"area":"Banks (incl. BaaS sponsor partners)","score":12,"rating":"High"},{"area":"Money services businesses (MSBs)","score":20,"rating":"Critical"},{"area":"BaaS / third-party program oversight","score":16,"rating":"Critical"},{"area":"Broker-dealers & investment advisers","score":9,"rating":"High"},{"area":"Casinos & gaming","score":9,"rating":"High"},{"area":"Complicit insiders","score":12,"rating":"High"},{"area":"Cash — bulk cash smuggling","score":16,"rating":"Critical"},{"area":"Funnel accounts","score":20,"rating":"Critical"},{"area":"Digital assets","score":16,"rating":"Critical"},{"area":"P2P payments & prepaid / gift cards","score":16,"rating":"Critical"},{"area":"Money orders","score":9,"rating":"High"},{"area":"Insurance","score":2,"rating":"Low"},{"area":"Legal entities & arrangements","score":16,"rating":"Critical"},{"area":"Gatekeepers","score":12,"rating":"High"},{"area":"High-value goods & property","score":12,"rating":"High"}],"NTFRA":[{"area":"ISIS (Islamic State of Iraq & Syria)","score":16,"rating":"Critical"},{"area":"Al-Qa’ida (AQ) & affiliates (al-Shabaab, JNIM)","score":12,"rating":"High"},{"area":"Hizballah","score":20,"rating":"Critical"},{"area":"Hamas","score":12,"rating":"High"},{"area":"Homegrown Violent Extremists (HVEs)","score":20,"rating":"Critical"},{"area":"Domestic Violent Extremists (DVEs)","score":12,"rating":"High"},{"area":"Cartels / TCOs designated as FTOs (special focus)","score":20,"rating":"Critical"},{"area":"Money Services Businesses (MSBs)","score":20,"rating":"Critical"},{"area":"Banks","score":12,"rating":"High"},{"area":"Online fundraising","score":16,"rating":"Critical"},{"area":"Peer-to-peer (P2P) payments","score":16,"rating":"Critical"},{"area":"Cash","score":16,"rating":"Critical"},{"area":"Digital assets","score":16,"rating":"Critical"},{"area":"Non-Profit Organisations (NPOs)","score":12,"rating":"High"}],"NPFRA":[{"area":"DPRK (North Korea)","score":25,"rating":"Critical"},{"area":"Iran","score":20,"rating":"Critical"},{"area":"Russia","score":20,"rating":"Critical"},{"area":"Chinese individuals & entities facilitating evasion","score":16,"rating":"Critical"},{"area":"Other state actors (Pakistan, Syria)","score":12,"rating":"High"},{"area":"Non-state actors (Hizballah, Houthis, TCOs/FTOs)","score":16,"rating":"Critical"},{"area":"Economic & trade (USD / financial-centre scale)","score":16,"rating":"Critical"},{"area":"Regulatory (sanctions, export controls, jurisdictio…","score":16,"rating":"Critical"},{"area":"Industrial & technological (dual-use goods)","score":12,"rating":"High"},{"area":"Banking & correspondent banking","score":16,"rating":"Critical"},{"area":"Digital Asset Service Providers (DASPs)","score":20,"rating":"Critical"},{"area":"Non-financial sectors (IT workers, maritime & shipp…","score":16,"rating":"Critical"}]}};

/* ============================================================================
   THREAT ATLAS  (entertaining-platform-design: Monster-in-the-House + Whydunit)
   Turns the MSB Compliance Risk Typology Register into a living bestiary:
   every typology is a threat with a modus operandi, red flags, an inherent
   rating, and the Mal control that defeats it. Core loop: scan -> spot ->
   defeat. Includes a recognition drill and a visible mastery meter.
============================================================================ */
const AT_RATEC = { "Critical": "#ef4444", "Very High": "#dc2626", "High": "#f59e0b", "Medium": "#1e63e9", "Low": "#17a34a" };
const atRC = (r) => AT_RATEC[r] || "#64748b";
const AT_CATC = (cat) => { const c = (cat || "").toUpperCase(); return c.includes("PF") ? "#7c3aed" : c.includes("TF") ? "#dc2626" : c.includes("PREDICATE") ? "#ea580c" : "#1e63e9"; };
const atCtl = (id) => AML_FRAMEWORK.controls.find(c => c.id === id);
const AT_KEY = "mal_atlas_studied_v1";
async function atLoad() { try { if (window.storage) { const r = await window.storage.get(AT_KEY); if (r && r.value) return JSON.parse(r.value); } } catch (e) {} return null; }
async function atSave(a) { try { if (window.storage) await window.storage.set(AT_KEY, JSON.stringify(a)); } catch (e) {} }

function ThreatAtlas() {
  const TA = THREAT_ATLAS;
  const [sub, setSub] = useState("board");
  const [studied, setStudied] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);
  const [jurF, setJurF] = useState("All");
  const [lensF, setLensF] = useState("All");
  const [q, setQ] = useState("");
  const [jurSel, setJurSel] = useState(TA.meta.jurisdictions[0]);

  useEffect(() => { (async () => { const s = await atLoad(); if (s && s.length) setStudied(new Set(s)); })(); }, []);
  const toggle = (id) => setStudied(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); atSave([...n]); return n; });

  const N = TA.typologies.length;
  const masteryPct = Math.round((studied.size / N) * 100);
  const corSorted = [...TA.corridors].sort((a, b) => b.score - a.score);
  const dist = TA.meta.distribution;
  const distTotal = dist.Critical + dist.High + dist.Medium + dist.Low;

  const lensMatch = (x) => lensF === "All" ? true : lensF === "Cross-border" ? x.xb : lensF === "MSB-specific" ? x.type === "MSB-specific" : lensF === "Emerging/Fintech" ? x.type === "Emerging/Fintech" : lensF === "TF" ? (x.cat || "").includes("TF") : lensF === "PF" ? (x.cat || "").includes("PF") : lensF === "ML" ? x.cat === "ML" : true;
  const filtered = TA.typologies.filter(x => (jurF === "All" || x.jur === jurF) && lensMatch(x) && (q === "" || (x.name + x.flags + x.desc).toLowerCase().includes(q.toLowerCase())));

  // ---- recognition drill ----
  const pickDrill = () => {
    const pool = TA.typologies;
    const tgt = pool[Math.floor(Math.random() * pool.length)];
    const others = pool.filter(p => p.name !== tgt.name).sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [tgt, ...others].sort(() => Math.random() - 0.5).map(o => o.name);
    return { tgt, opts };
  };
  const [drill, setDrill] = useState(pickDrill);
  const [picked, setPicked] = useState(null);
  const [drillScore, setDrillScore] = useState({ ok: 0, n: 0 });
  const answer = (name) => {
    if (picked) return;
    setPicked(name);
    const correct = name === drill.tgt.name;
    setDrillScore(s => ({ ok: s.ok + (correct ? 1 : 0), n: s.n + 1 }));
    if (correct) toggle(drill.tgt.id);
  };
  const nextDrill = () => { setPicked(null); setDrill(pickDrill()); };

  const SUBS = [["board", "Global threat board", Globe], ["bestiary", "Threat bestiary", Flame], ["drill", "Spot the typology", Search], ["corridors", "Corridors", TrendingUp], ["segments", "Customer segments", Users], ["jurs", "Jurisdictions", Building2]];
  const defenceChips = (ids) => (ids || []).map(id => { const c = atCtl(id); return <span key={id} className="chip" style={{ background: "var(--brand50)", color: "var(--brand600)" }} title={c ? c.requirement : ""}>{id}{c ? " · " + c.requirement.slice(0, 34) : ""}</span>; });

  return (
    <>
      <h1 className="h1">Threat Atlas</h1>
      <p className="sub">Every money-laundering, terrorist-financing and proliferation typology that targets Mal's corridors — as a living bestiary. For each: how the scheme moves value, the red flags that betray it, its inherent risk, and the Mal control that defeats it. Scan, learn to spot it, know the defence.</p>

      <div className="row" style={{ gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {SUBS.map(([id, label, Ic]) => (
          <button key={id} className={"btn" + (sub === id ? " gold" : " ghost")} onClick={() => setSub(id)}><Ic size={13} /> {label}</button>
        ))}
      </div>

      {/* mastery meter (always visible on board/bestiary/drill) */}
      {["board", "bestiary", "drill"].includes(sub) && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <b style={{ fontSize: 13 }}><Trophy size={14} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--gold)" }} />Recognition mastery</b>
            <span className="muted" style={{ fontSize: 12.5 }}>You can recognise <b style={{ color: "var(--brand600)" }}>{studied.size}</b> of {N} corridor typologies</span>
          </div>
          <div className="bar" style={{ marginTop: 9, height: 9 }}><span style={{ width: masteryPct + "%", background: "linear-gradient(90deg,var(--brand),var(--gold))" }} /></div>
        </div>
      )}

      {/* ---------- BOARD ---------- */}
      {sub === "board" && (<>
        <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 13 }}>
          <Kpi label="Typologies catalogued" value={N} sub="across 8 jurisdictions" />
          <Kpi label="Critical inherent risks" value={dist.Critical} accent="var(--red)" sub={`of ${distTotal} rated items`} />
          <Kpi label="Payout corridors rated" value={TA.corridors.length} />
          <Kpi label="Recognition mastery" value={masteryPct + "%"} accent="var(--brand600)" />
        </div>

        <div className="card" style={{ marginBottom: 13 }}><h3>Inherent-risk distribution (L×I across the register)</h3>
          <div className="bar" style={{ height: 16, display: "flex", overflow: "hidden" }}>
            <span style={{ width: (dist.Critical / distTotal * 100) + "%", background: "#ef4444" }} />
            <span style={{ width: (dist.High / distTotal * 100) + "%", background: "#f59e0b" }} />
            <span style={{ width: (dist.Medium / distTotal * 100) + "%", background: "#1e63e9" }} />
            <span style={{ width: (dist.Low / distTotal * 100) + "%", background: "#17a34a" }} />
          </div>
          <div className="row" style={{ gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 12 }}>
            <span><span className="catdot" style={{ background: "#ef4444" }} /> Critical {dist.Critical}</span>
            <span><span className="catdot" style={{ background: "#f59e0b" }} /> High {dist.High}</span>
            <span><span className="catdot" style={{ background: "#1e63e9" }} /> Medium {dist.Medium}</span>
            <span><span className="catdot" style={{ background: "#17a34a" }} /> Low {dist.Low}</span>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 13 }}>
          <div className="card"><h3>Highest-risk corridors</h3>
            {corSorted.slice(0, 6).map((c, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 12.5 }}>{c.corridor}</span>
                <span className="chip" style={{ background: atRC(c.rating) + "22", color: atRC(c.rating) }}>{c.score} · {c.rating}</span>
              </div>
            ))}
          </div>
          <div className="card"><h3>What's actually moving (US 2026 Treasury)</h3>
            {TA.meta.headline.slice(0, 6).map((h, i) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{h[0]}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{h[1]} <span style={{ opacity: .7 }}>· {h[2]}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ borderColor: "var(--amber)", background: "#fffbeb" }}>
          <div className="row" style={{ gap: 8, alignItems: "flex-start" }}><AlertTriangle size={15} color="var(--amber)" style={{ marginTop: 1 }} />
            <span style={{ fontSize: 12.5 }}><b>Working draft — verify before use.</b> Ratings, thresholds, FATF status and NRA findings in this register are internally compiled with no live web access and are time-sensitive (marked <b>[VERIFY]</b> in the source). Treat every item as a lead to confirm at the primary source (FATF/FSRB MER, the relevant FIU/regulator, FinCEN/OFAC), not as current authority.</span>
          </div>
        </div>
      </>)}

      {/* ---------- BESTIARY ---------- */}
      {sub === "bestiary" && (<>
        <div className="card" style={{ marginBottom: 13 }}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <select value={jurF} onChange={e => setJurF(e.target.value)} style={{ width: "auto", minWidth: 140 }}><option>All</option>{TA.meta.jurisdictions.map(j => <option key={j}>{j}</option>)}</select>
            <select value={lensF} onChange={e => setLensF(e.target.value)} style={{ width: "auto", minWidth: 140 }}>{["All", "Cross-border", "ML", "TF", "PF", "MSB-specific", "Emerging/Fintech"].map(l => <option key={l}>{l}</option>)}</select>
            <div className="row" style={{ gap: 6, flex: 1, minWidth: 160, border: "1px solid var(--line)", borderRadius: 9, padding: "0 10px" }}><Search size={14} className="muted" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search schemes / red flags…" style={{ border: "none", background: "transparent", flex: 1, padding: "8px 0", outline: "none", fontFamily: "var(--sans)", fontSize: 13 }} /></div>
            <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>{filtered.length} threats</span>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12 }}>
          {filtered.map(x => { const open = openId === x.id; const isStudied = studied.has(x.id); return (
            <div key={x.id} className="card" style={{ padding: 14, borderLeft: `3px solid ${AT_CATC(x.cat)}`, opacity: isStudied && !open ? .82 : 1 }}>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                <span className="chip" style={{ background: AT_CATC(x.cat) + "22", color: AT_CATC(x.cat) }}>{x.cat}</span>
                <span className="chip" style={{ background: "#f5f6fb" }}>{x.jur}</span>
                {x.xb && <span className="chip" style={{ background: "#fef3c7", color: "#b45309" }} title={x.xbName}>cross-border</span>}
                {isStudied && <span className="chip" style={{ background: "#dcfce7", color: "#16a34a" }}><Check size={11} /> known</span>}
              </div>
              <b style={{ fontSize: 13.5, display: "block", marginBottom: 4 }}>{x.name}</b>
              <div className="muted" style={{ fontSize: 12.5 }}>{x.desc}</div>
              <button className="btn ghost" style={{ marginTop: 9, padding: "4px 11px", fontSize: 11.5 }} onClick={() => setOpenId(open ? null : x.id)}>{open ? "Hide" : "Reveal red flags + defence"}</button>
              {open && (<div style={{ marginTop: 10 }}>
                <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>Red flags (how you spot it)</div>
                <div style={{ fontSize: 12.5, marginBottom: 9 }}>{x.flags}</div>
                <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Defeated by — Mal controls</div>
                <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>{defenceChips(x.def)}</div>
                <div className="muted" style={{ fontSize: 10.5, marginTop: 9 }}>Source [VERIFY]: {x.src}</div>
                <button className="btn" style={{ marginTop: 10, padding: "4px 11px", fontSize: 11.5, background: isStudied ? "#e7e9f2" : undefined, color: isStudied ? "var(--text)" : undefined }} onClick={() => toggle(x.id)}>{isStudied ? "Studied ✓ — unmark" : "Mark as studied"}</button>
              </div>)}
            </div>
          ); })}
        </div>
      </>)}

      {/* ---------- DRILL ---------- */}
      {sub === "drill" && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Spot the typology</h3>
            <span className="muted" style={{ fontSize: 12.5 }}>Score {drillScore.ok}/{drillScore.n}</span>
          </div>
          <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Red flags observed{drill.tgt.jur ? " · " + drill.tgt.jur : ""}</div>
          <div style={{ fontSize: 13.5, background: "var(--brand50)", borderRadius: 10, padding: "11px 13px", marginBottom: 12 }}>{drill.tgt.flags}</div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 7 }}>Which scheme is this?</div>
          <div className="grid" style={{ gap: 8 }}>
            {drill.opts.map(o => { const isT = o === drill.tgt.name; const chosen = picked === o;
              const bg = !picked ? undefined : isT ? "#dcfce7" : chosen ? "#fee2e2" : undefined;
              const bc = !picked ? "var(--line)" : isT ? "#16a34a" : chosen ? "#ef4444" : "var(--line)";
              return <button key={o} className="btn ghost" style={{ justifyContent: "flex-start", textAlign: "left", background: bg, borderColor: bc, opacity: picked && !isT && !chosen ? .6 : 1 }} onClick={() => answer(o)}>
                {picked && isT && <Check size={14} color="#16a34a" />}{picked && chosen && !isT && <X size={14} color="#ef4444" />}{o}
              </button>; })}
          </div>
          {picked && (<div style={{ marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>{drill.tgt.desc}</div>
            <div className="row" style={{ gap: 5, flexWrap: "wrap", marginBottom: 10 }}><span className="muted" style={{ fontSize: 11.5 }}>Defence:</span>{defenceChips(drill.tgt.def)}</div>
            <button className="btn gold" onClick={nextDrill}><ChevronRight size={14} /> Next threat</button>
          </div>)}
        </div>
      )}

      {/* ---------- CORRIDORS ---------- */}
      {sub === "corridors" && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 12 }}>
          {corSorted.map((c, i) => (
            <div key={i} className="card" style={{ padding: 14, borderTop: `3px solid ${atRC(c.rating)}` }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <b style={{ fontSize: 13.5 }}>{c.corridor}</b>
                <span className="chip" style={{ background: atRC(c.rating) + "22", color: atRC(c.rating) }}>L×I {c.score} · {c.rating}</span>
              </div>
              <div className="muted" style={{ fontSize: 12, margin: "6px 0" }}>{c.profile}</div>
              <div style={{ fontSize: 12, marginBottom: 5 }}><b>Typologies:</b> {c.typ}</div>
              <div style={{ fontSize: 12, marginBottom: 5 }}><b>Red flags:</b> {c.flags}</div>
              <div className="muted" style={{ fontSize: 11.5 }}><b>Actors:</b> {c.actors}</div>
              <div className="muted" style={{ fontSize: 10.5, marginTop: 6 }}>Advisories [VERIFY]: {c.adv} · Register IDs {c.ids}</div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- SEGMENTS ---------- */}
      {sub === "segments" && (
        <div className="card"><h3>Customer-segment typology exposure (Mal)</h3>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Ratings reflect typology exposure and transaction patterns, not assumptions about individuals — most customers in every segment are legitimate; for mule-targeted segments the risk is third-party abuse of the account.</div>
          <div className="tablewrap"><table>
            <thead><tr><th>Segment</th><th>Associated typology</th><th>Red-flag indicators</th><th>L</th><th>I</th><th>L×I</th><th>Rating</th></tr></thead>
            <tbody>{[...TA.segments].sort((a, b) => b.score - a.score).map((s, i) => (
              <tr key={i}>
                <td>{s.seg}</td><td>{s.typ}</td><td className="muted" style={{ minWidth: 200 }}>{s.flags}</td>
                <td className="mono">{s.L}</td><td className="mono">{s.I}</td><td className="mono">{s.score}</td>
                <td><span className="chip" style={{ background: atRC(s.rating) + "22", color: atRC(s.rating) }}>{s.rating}</span></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      {/* ---------- JURISDICTIONS ---------- */}
      {sub === "jurs" && (() => { const j = TA.jurProfiles.find(p => p.jur === jurSel) || TA.jurProfiles[0]; return (
        <>
          <div className="row" style={{ gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
            {TA.jurProfiles.map(p => <button key={p.jur} className={"btn" + (p.jur === jurSel ? " gold" : " ghost")} style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => setJurSel(p.jur)}>{p.jur}</button>)}
          </div>
          <div className="card"><h3>{j.jur} — jurisdiction dossier</h3>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Dossier k="Primary regulator(s)" v={j.reg} />
              <Dossier k="FIU & reporting channel" v={j.fiu} />
              <Dossier k="Core AML/CFT framework" v={j.fw} />
              <Dossier k="Assessment body" v={j.body} />
              <Dossier k="FATF / FSRB status [VERIFY]" v={j.fatf} />
              <Dossier k="Key deficiencies [VERIFY]" v={j.defi} />
              <Dossier k="Cash / threshold reporting" v={j.thr} />
              <Dossier k="Record retention" v={j.ret} />
            </div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Typologies here:</span>
              {TA.typologies.filter(x => x.jur === j.jur).map(x => <span key={x.id} className="chip" style={{ background: AT_CATC(x.cat) + "18", color: AT_CATC(x.cat) }}>{x.name}</span>)}
            </div>
          </div>
        </>
      ); })()}
    </>
  );
}
function Dossier({ k, v }) { return (<div><div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{k}</div><div style={{ fontSize: 12.5 }}>{v}</div></div>); }


/* ============================================================================
   CONTROL REGISTER & EVIDENCE VAULT  (continuous control monitoring)
   Turns AML_FRAMEWORK into a standing, owned, evidenced, freshness-tracked
   control register: control health, evidence vault, testing calendar.
   Seeded deterministically; edits persist via window.storage (overrides).
============================================================================ */
const CR_KEY = "mal_control_register_v1";
const CR_STATC = { "Operating": "#17a34a", "Partial": "#f59e0b", "Gap": "#ef4444", "Not implemented": "#94a3b8" };
const CR_STATUSES = ["Operating", "Partial", "Gap", "Not implemented"];
const CR_EVTYPES = ["Policy document", "Test result", "System screenshot", "Board minute", "Sample file", "Vendor report", "Attestation"];
const CR_OWNER = (d) => ({ REG: "MLRO + Legal", GOV: "MLRO", RA: "MLRO", CDD: "FinCrime Ops", EDD: "FinCrime Ops", OM: "FinCrime Ops", TM: "FinCrime Ops + Engineering", SANC: "US BSA CO (Jason Mullen)", PEP: "FinCrime Ops", SAR: "US BSA CO (Jason Mullen)", REP: "US BSA CO (Jason Mullen)", REC: "Engineering + FinCrime Ops", TRN: "Compliance / Training", AUD: "Independent / Board", TPO: "Back-Office Ops + MLRO", DOB: "FinCrime Ops", ESC: "FinCrime Ops" }[d] || "Compliance");
const CR_CAD = (risk) => risk === "Critical" ? 3 : risk === "High" ? 6 : 12;
const crHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const crDate = (d) => new Date(d).toISOString().slice(0, 10);
const DAY = 864e5;
async function crLoadLocal() { try { if (window.storage) { const r = await window.storage.get(CR_KEY); if (r && r.value) return JSON.parse(r.value); } } catch (e) {} return null; }
async function crSaveLocal(o) { try { if (window.storage) await window.storage.set(CR_KEY, JSON.stringify(o)); } catch (e) {} }
async function crLoad() {
  try {
    if (await apiAvailable()) {
      const rows = await apiFetch("/controls", { auth: false });
      const ov = {};
      rows.forEach(c => { ov[c.id] = mapControlToOv(c); });
      await crSaveLocal(ov);
      return ov;
    }
  } catch (e) {}
  return crLoadLocal();
}
async function crSave(o) { await crSaveLocal(o); }
async function crSyncToApi(id, patch, cur) {
  try {
    if (!(await apiAvailable())) return;
    if (patch.status && patch.status !== cur.status)
      await apiFetch("/controls/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: JSON.stringify({ status: BE_CTL_STATUS[patch.status] }) });
    if (patch.evidence && patch.evidence.length > (cur.evidence?.length || 0)) {
      const ev = patch.evidence[patch.evidence.length - 1];
      await apiFetch("/controls/" + encodeURIComponent(id) + "/evidence", { method: "POST", body: JSON.stringify({ name: ev.name, type: ev.type }) });
    } else if (patch.lastTested && patch.lastTested !== cur.lastTested)
      await apiFetch("/controls/" + encodeURIComponent(id) + "/test", { method: "POST", body: JSON.stringify({ result: BE_CTL_STATUS[patch.status || cur.status] || "OPERATING" }) });
  } catch (e) {}
}
function crSeedOne(c) {
  const h = crHash(c.id), r = h % 100;
  const status = r < 66 ? "Operating" : r < 82 ? "Partial" : r < 93 ? "Gap" : "Not implemented";
  const monthsAgo = h % 11;
  const lastTested = status === "Not implemented" ? null : crDate(Date.now() - monthsAgo * 30 * DAY);
  const evN = status === "Not implemented" ? 0 : ((h >> 3) % 3);
  const evidence = [];
  for (let k = 0; k < evN; k++) { const ty = CR_EVTYPES[(h >> (k + 2)) % CR_EVTYPES.length]; evidence.push({ id: c.id + "-e" + k, name: ty + " — " + c.id, type: ty, at: lastTested || crDate(Date.now()) }); }
  return { status, lastTested, evidence, owner: CR_OWNER(c.domain), cadence: CR_CAD(c.risk) };
}
function crFresh(lastTested, cad) {
  if (!lastTested) return { state: "Never tested", c: "#94a3b8", days: null };
  const due = new Date(lastTested).getTime() + cad * 30 * DAY, days = Math.round((due - Date.now()) / DAY);
  if (days < 0) return { state: "Overdue", c: "#ef4444", days };
  if (days <= 30) return { state: "Due soon", c: "#f59e0b", days };
  return { state: "Current", c: "#17a34a", days };
}
const crScore = (s) => s === "Operating" ? 100 : s === "Partial" ? 50 : 0;

function ControlRegister() {
  const [sub, setSub] = useState("dashboard");
  const [ov, setOv] = useState({});
  const [openId, setOpenId] = useState(null);
  const [domF, setDomF] = useState("All");
  const [statF, setStatF] = useState("All");
  const [q, setQ] = useState("");
  const [evName, setEvName] = useState("");
  const [evType, setEvType] = useState(CR_EVTYPES[0]);
  const [evFilter, setEvFilter] = useState("All");

  useEffect(() => { (async () => { const o = await crLoad(); if (o) setOv(o); })(); }, []);

  const W = AML_FRAMEWORK.riskWeights;
  const defCount = useMemo(() => { const m = {}; THREAT_ATLAS.typologies.forEach(t => (t.def || []).forEach(id => { m[id] = (m[id] || 0) + 1; })); return m; }, []);
  const rows = useMemo(() => AML_FRAMEWORK.controls.map(c => { const s = crSeedOne(c); const o = ov[c.id] || {}; return { ...c, owner: s.owner, cadence: s.cadence, status: o.status || s.status, lastTested: o.lastTested !== undefined ? o.lastTested : s.lastTested, evidence: o.evidence || s.evidence }; }), [ov]);

  const setRow = (id, patch) => { const cur = rows.find(r => r.id === id); const next = { status: cur.status, lastTested: cur.lastTested, evidence: cur.evidence, ...patch }; setOv(o => { const no = { ...o, [id]: next }; crSave(no); return no; }); crSyncToApi(id, patch, cur); };
  const markTested = (id) => setRow(id, { lastTested: crDate(Date.now()) });
  const setStatus = (id, s) => setRow(id, { status: s });
  const addEvidence = (id) => { if (!evName.trim()) return; const cur = rows.find(r => r.id === id); const ev = [...cur.evidence, { id: id + "-u" + Date.now(), name: evName.trim(), type: evType, at: crDate(Date.now()) }]; setRow(id, { evidence: ev, lastTested: crDate(Date.now()) }); setEvName(""); };

  // metrics
  const wavg = (arr) => { const tw = arr.reduce((s, x) => s + (W[x.risk] || 1), 0) || 1; return Math.round(arr.reduce((s, x) => s + crScore(x.status) * (W[x.risk] || 1), 0) / tw); };
  const health = wavg(rows);
  const statusCount = CR_STATUSES.map(s => ({ s, n: rows.filter(r => r.status === s).length }));
  const fresh = rows.map(r => ({ ...r, f: crFresh(r.lastTested, r.cadence) }));
  const evidenced = rows.filter(r => r.evidence.length > 0).length;
  const currentN = fresh.filter(r => r.f.state === "Current").length;
  const dueSoon = fresh.filter(r => r.f.state === "Due soon");
  const overdue = fresh.filter(r => r.f.state === "Overdue");
  const never = fresh.filter(r => r.f.state === "Never tested");
  const gaps = rows.filter(r => r.status === "Gap" || r.status === "Not implemented");
  const allEvidence = rows.flatMap(r => r.evidence.map(e => ({ ...e, ctl: r.id, dom: r.domain })));
  const domains = AML_FRAMEWORK.domains.map(d => { const cs = rows.filter(r => r.domain === d.id); return { ...d, score: wavg(cs), total: cs.length, op: cs.filter(c => c.status === "Operating").length }; });
  const calendar = [...fresh].filter(r => r.f.days !== null).sort((a, b) => a.f.days - b.f.days);

  const dn = (id) => AML_FRAMEWORK.domains.find(x => x.id === id)?.name || id;
  const SUBS = [["dashboard", "Control dashboard", Activity], ["register", "Control register", ClipboardCheck], ["vault", "Evidence vault", Database], ["calendar", "Testing calendar", Clock]];
  const hb = amlBand(health);

  function exportXlsx() {
    try {
      const wb = XLSX.utils.book_new();
      const a = [["Control", "Domain", "Risk", "Owner", "Status", "Cadence (mo)", "Last tested", "Next due", "Freshness", "Evidence items", "Regulatory basis"]];
      fresh.forEach(r => a.push([r.id, dn(r.domain), r.risk, r.owner, r.status, r.cadence, r.lastTested || "—", r.lastTested ? crDate(new Date(r.lastTested).getTime() + r.cadence * 30 * DAY) : "—", r.f.state, r.evidence.length, r.citation]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), "Control register");
      const e = [["Control", "Domain", "Evidence", "Type", "Date"]];
      allEvidence.forEach(x => e.push([x.ctl, dn(x.dom), x.name, x.type, x.at]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(e), "Evidence vault");
      XLSX.writeFile(wb, "Mal_Control_Register.xlsx");
    } catch (e) {}
  }

  const filtered = fresh.filter(r => (domF === "All" || r.domain === domF) && (statF === "All" || r.status === statF) && (q === "" || (r.id + r.requirement + r.owner).toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <h1 className="h1">Control Register & Evidence Vault</h1>
      <p className="sub">Continuous control monitoring over Mal's {AML_FRAMEWORK.controls.length} AML/CFT controls. Each control has an owner, an operating status, a test cadence with freshness tracking, and an evidence trail — so the programme is audit-ready on demand and the quarterly Board dashboard writes itself.</p>

      <div className="row" style={{ gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {SUBS.map(([id, label, Ic]) => <button key={id} className={"btn" + (sub === id ? " gold" : " ghost")} onClick={() => setSub(id)}><Ic size={13} /> {label}</button>)}
        <span className="spacer" />
        <button className="btn" onClick={exportXlsx}><Download size={13} /> Export</button>
      </div>

      {/* DASHBOARD */}
      {sub === "dashboard" && (<>
        <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 13 }}>
          <div className="card" style={{ textAlign: "center" }}><h3>Control health</h3>
            <div className="ring" style={{ width: 64, height: 64, margin: "4px auto", background: `conic-gradient(${hb.c} ${health * 3.6}deg,#e7e9f2 0)` }}><div className="hole" style={{ fontSize: 16, color: hb.c }}>{health}</div></div>
            <span className="chip" style={{ background: hb.c + "22", color: hb.c }}>{hb.t}</span>
          </div>
          <Kpi label="Evidence current" value={currentN + "/" + rows.length} sub={evidenced + " controls evidenced"} accent={amlBand(Math.round(currentN / rows.length * 100)).c} />
          <Kpi label="Due / overdue" value={dueSoon.length + overdue.length} sub={overdue.length + " overdue"} accent={overdue.length ? "var(--red)" : "var(--amber)"} />
          <Kpi label="Open gaps" value={gaps.length} accent={gaps.length ? "var(--red)" : "var(--green)"} sub="Gap or not implemented" />
          <Kpi label="Never tested" value={never.length} accent={never.length ? "var(--amber)" : "var(--green)"} />
        </div>

        <div className="card" style={{ marginBottom: 13 }}><h3>Status breakdown</h3>
          <div className="bar" style={{ height: 16, display: "flex", overflow: "hidden" }}>
            {statusCount.map(x => x.n > 0 && <span key={x.s} title={x.s + " " + x.n} style={{ width: (x.n / rows.length * 100) + "%", background: CR_STATC[x.s] }} />)}
          </div>
          <div className="row" style={{ gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 12 }}>
            {statusCount.map(x => <span key={x.s}><span className="catdot" style={{ background: CR_STATC[x.s] }} /> {x.s} {x.n}</span>)}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 13 }}><h3>Control health by domain</h3>
          <div className="heat">
            {domains.map(d => { const b = amlBand(d.score); return (
              <div className="tile" key={d.id} style={{ borderColor: b.c + "66" }}>
                <div className="row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: 12 }}>{d.name}</b><span className="catdot" style={{ background: d.color }} /></div>
                <div className="kpi" style={{ fontSize: 19, color: b.c, marginTop: 5 }}>{d.score}</div>
                <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>{d.op}/{d.total} operating</div>
              </div>
            ); })}
          </div>
        </div>

        <div className="card"><h3>Needs attention — soonest first</h3>
          {[...overdue, ...dueSoon].slice(0, 8).length === 0 ? <div className="muted" style={{ fontSize: 13 }}>Nothing overdue or due within 30 days.</div> :
            [...overdue, ...dueSoon].sort((a, b) => a.f.days - b.f.days).slice(0, 8).map(r => (
              <div key={r.id} className="row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", gap: 8 }}>
                <div className="row" style={{ gap: 8 }}><span className="chip mono" style={{ background: "#f5f6fb" }}>{r.id}</span><span style={{ fontSize: 12.5 }}>{r.requirement}</span></div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="chip" style={{ background: r.f.c + "22", color: r.f.c }}>{r.f.state}{r.f.days < 0 ? ` ${-r.f.days}d` : ` ${r.f.days}d`}</span>
                  <button className="btn ghost" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => markTested(r.id)}>Mark tested</button>
                </div>
              </div>
            ))}
        </div>
      </>)}

      {/* REGISTER */}
      {sub === "register" && (<>
        <div className="card" style={{ marginBottom: 13 }}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <select value={domF} onChange={e => setDomF(e.target.value)} style={{ width: "auto", minWidth: 150 }}><option value="All">All domains</option>{AML_FRAMEWORK.domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <select value={statF} onChange={e => setStatF(e.target.value)} style={{ width: "auto", minWidth: 130 }}><option value="All">All statuses</option>{CR_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
            <div className="row" style={{ gap: 6, flex: 1, minWidth: 160, border: "1px solid var(--line)", borderRadius: 9, padding: "0 10px" }}><Search size={14} className="muted" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search controls / owners…" style={{ border: "none", background: "transparent", flex: 1, padding: "8px 0", outline: "none", fontFamily: "var(--sans)", fontSize: 13 }} /></div>
            <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>{filtered.length} controls</span>
          </div>
        </div>
        <div className="grid" style={{ gap: 10 }}>
          {filtered.map(r => { const open = openId === r.id; return (
            <div key={r.id} className="card" style={{ padding: 14, borderLeft: `3px solid ${CR_STATC[r.status]}` }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <span className="chip mono" style={{ background: "#f5f6fb" }}>{r.id}</span>
                  <b style={{ fontSize: 13.5 }}>{r.requirement}</b>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="chip" style={{ background: CR_STATC[r.status] + "22", color: CR_STATC[r.status] }}>{r.status}</span>
                  <span className="chip" style={{ background: r.f.c + "22", color: r.f.c }}>{r.f.state}</span>
                </div>
              </div>
              <div className="row" style={{ gap: 14, marginTop: 7, flexWrap: "wrap", fontSize: 11.5 }} >
                <span className="muted">Owner: <b style={{ color: "var(--text)" }}>{r.owner}</b></span>
                <span className="muted">Risk: {r.risk}</span>
                <span className="muted">Cadence: every {r.cadence} mo</span>
                <span className="muted">Last tested: {r.lastTested || "never"}</span>
                {defCount[r.id] ? <span className="muted">Defends against {defCount[r.id]} typolog{defCount[r.id] === 1 ? "y" : "ies"}</span> : null}
              </div>
              <button className="btn ghost" style={{ marginTop: 9, padding: "4px 11px", fontSize: 11.5 }} onClick={() => { setOpenId(open ? null : r.id); setEvName(""); }}>{open ? "Close" : "Manage control + evidence"}</button>
              {open && (<div style={{ marginTop: 11 }}>
                <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>{r.expected} <span style={{ opacity: .7 }}>· {r.citation}</span></div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 11 }}>
                  <span className="muted" style={{ fontSize: 11.5, alignSelf: "center" }}>Set status:</span>
                  {CR_STATUSES.map(s => <button key={s} className="btn ghost" style={{ padding: "3px 9px", fontSize: 11, borderColor: r.status === s ? CR_STATC[s] : "var(--line)", color: r.status === s ? CR_STATC[s] : undefined }} onClick={() => setStatus(r.id, s)}>{s}</button>)}
                  <button className="btn gold" style={{ padding: "3px 11px", fontSize: 11 }} onClick={() => markTested(r.id)}><Check size={12} /> Mark tested today</button>
                </div>
                <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Evidence ({r.evidence.length})</div>
                {r.evidence.length === 0 && <div className="muted" style={{ fontSize: 12, marginBottom: 7 }}>No evidence attached yet.</div>}
                {r.evidence.map(e => <div key={e.id} className="row" style={{ gap: 8, padding: "4px 0", fontSize: 12 }}><FileText size={13} className="muted" /><b style={{ fontWeight: 600 }}>{e.name}</b><span className="chip" style={{ background: "#f5f6fb" }}>{e.type}</span><span className="muted">{e.at}</span></div>)}
                <div className="row" style={{ gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                  <input value={evName} onChange={e => setEvName(e.target.value)} placeholder="Evidence name / reference…" style={{ width: "auto", flex: 1, minWidth: 160, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 9, fontFamily: "var(--sans)", fontSize: 12.5 }} />
                  <select value={evType} onChange={e => setEvType(e.target.value)} style={{ width: "auto", minWidth: 130 }}>{CR_EVTYPES.map(t => <option key={t}>{t}</option>)}</select>
                  <button className="btn" onClick={() => addEvidence(r.id)}><Plus size={13} /> Add evidence</button>
                </div>
              </div>)}
            </div>
          ); })}
        </div>
      </>)}

      {/* VAULT */}
      {sub === "vault" && (<>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 13 }}>
          <Kpi label="Evidence items" value={allEvidence.length} />
          <Kpi label="Controls evidenced" value={evidenced + "/" + rows.length} accent={amlBand(Math.round(evidenced / rows.length * 100)).c} />
          <Kpi label="Controls with no evidence" value={rows.length - evidenced} accent={(rows.length - evidenced) ? "var(--amber)" : "var(--green)"} />
        </div>
        <div className="card">
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <h3 style={{ margin: 0, flex: 1 }}>Evidence vault</h3>
            <select value={evFilter} onChange={e => setEvFilter(e.target.value)} style={{ width: "auto", minWidth: 150 }}><option value="All">All types</option>{CR_EVTYPES.map(t => <option key={t}>{t}</option>)}</select>
          </div>
          {(rows.length - evidenced) > 0 && <div className="row" style={{ gap: 8, marginBottom: 10, background: "#fffbeb", border: "1px solid var(--amber)", borderRadius: 9, padding: "8px 11px" }}><AlertTriangle size={14} color="var(--amber)" /><span style={{ fontSize: 12 }}>{rows.length - evidenced} controls have no evidence attached — open them in the register to attach a test result, policy reference or board minute.</span></div>}
          <div className="tablewrap"><table>
            <thead><tr><th>Control</th><th>Domain</th><th>Evidence</th><th>Type</th><th>Date</th></tr></thead>
            <tbody>{allEvidence.filter(e => evFilter === "All" || e.type === evFilter).sort((a, b) => (a.at < b.at ? 1 : -1)).map(e => (
              <tr key={e.id}><td className="mono">{e.ctl}</td><td>{dn(e.dom)}</td><td>{e.name}</td><td><span className="chip" style={{ background: "#f5f6fb" }}>{e.type}</span></td><td className="muted">{e.at}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      </>)}

      {/* CALENDAR */}
      {sub === "calendar" && (
        <div className="card"><h3>Testing calendar</h3>
          <div className="muted" style={{ fontSize: 12, marginBottom: 11 }}>Every control by next-test due date — cadence is risk-based (Critical every 3 months, High every 6, Medium/Low annually). Overdue first.</div>
          <div className="tablewrap"><table>
            <thead><tr><th>Due</th><th>Control</th><th>Domain</th><th>Owner</th><th>Cadence</th><th>Last tested</th><th>Status</th><th></th></tr></thead>
            <tbody>{calendar.map(r => { const nd = crDate(new Date(r.lastTested).getTime() + r.cadence * 30 * DAY); return (
              <tr key={r.id}>
                <td><span className="chip" style={{ background: r.f.c + "22", color: r.f.c }}>{nd}</span></td>
                <td className="mono">{r.id}</td><td>{dn(r.domain)}</td><td className="muted">{r.owner}</td>
                <td className="muted">{r.cadence} mo</td><td className="muted">{r.lastTested}</td>
                <td><span className="chip" style={{ background: CR_STATC[r.status] + "22", color: CR_STATC[r.status] }}>{r.status}</span></td>
                <td><button className="btn ghost" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => markTested(r.id)}>Mark tested</button></td>
              </tr>
            ); })}</tbody>
          </table></div>
        </div>
      )}

      <div className="card" style={{ marginTop: 13, borderColor: "var(--line)" }}>
        <div className="row" style={{ gap: 8, alignItems: "flex-start" }}><CircleAlert size={14} className="muted" style={{ marginTop: 1 }} /><span className="muted" style={{ fontSize: 11.5 }}>Demonstrator: statuses and evidence are seeded and stored in this browser. In production this register is fed by integrations (screening, IDV, ledger, list feeds), evidence is held in an immutable store, and every change is written to a tamper-evident audit log with maker-checker approval.</span></div>
      </div>
    </>
  );
}


/* ============================================================================
   CASE MANAGEMENT  (operational financial-crime workflow)
   alert -> case -> investigation (DPL) -> disposition -> four-eyes -> SAR pack
   SLA clocks (P1 4h / P2 24h / P3 48h response; 30-day SAR), maker-checker,
   and links to Threat Atlas typologies + Control Register controls.
   Seeded; persists via window.storage.
============================================================================ */
const CM_KEY = "mal_cases_v1";
const CM_SLA = { P1: 4, P2: 24, P3: 48 }; // response hours
const CM_SEVC = { P1: "#ef4444", P2: "#f59e0b", P3: "#1e63e9" };
const CM_STATC = { "Open": "#1e63e9", "Investigating": "#8000ff", "Pending QA": "#f59e0b", "SAR filed": "#b91c1c", "Closed — No SAR": "#64748b", "Escalated": "#ef4444" };
const CM_HR = 36e5, CM_DAY = 864e5;
const cmNow = () => Date.now();
const cmDT = (t) => { const d = new Date(t); return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
const cmDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
async function cmLoadLocal() { try { if (window.storage) { const r = await window.storage.get(CM_KEY); if (r && r.value) return JSON.parse(r.value); } } catch (e) {} return null; }
async function cmSaveLocal(o) { try { if (window.storage) await window.storage.set(CM_KEY, JSON.stringify(o)); } catch (e) {} }
async function cmLoad() {
  try {
    if (await apiAvailable()) {
      const apiData = await fetchCasesFromApi();
      const local = await cmLoadLocal();
      const data = { ...apiData, alerts: local?.alerts || cmSeed().alerts };
      await cmSaveLocal(data);
      return data;
    }
  } catch (e) {}
  const o = await cmLoadLocal();
  return o && o.cases ? o : null;
}
async function cmSave(o) { await cmSaveLocal(o); }

function cmSeed() {
  const N = cmNow();
  const C = (o) => ({ disposition: "", rationale: "", reviewer: "", approvedAt: null, sarClockStart: null, sarFiled: null, narrative: "", controls: [], ...o });
  const cases = [
    C({ id: "CASE-2026-0001", title: "Hawala layering — many senders to one beneficiary", typology: "28", typName: "Hawala / hundi", sev: "P2", source: "Oscilar TM", cust: "CUST-8842", corridor: "US → Pakistan", amount: 9400, status: "Investigating", assignee: "You", opened: N - 30 * CM_HR, controls: ["TM-1", "TPO-4", "OM-3"],
      dpl: [{ at: N - 30 * CM_HR, who: "System", act: "Case opened", note: "Promoted from Oscilar alert AL-0091 (many-to-one + rapid cash-out)." }, { at: N - 26 * CM_HR, who: "You", act: "Reviewed transaction history", note: "11 unrelated senders to one beneficiary over 6 days; cash-out at SwiftX agent within minutes." }, { at: N - 22 * CM_HR, who: "You", act: "Linked typology", note: "Pakistan hawala / hundi (cross-border IVTS)." }] }),
    C({ id: "CASE-2026-0002", title: "Pig-butchering inbound — mule pass-through", typology: "35", typName: "Cyber fraud, romance & investment scams", sev: "P2", source: "Oscilar TM", cust: "CUST-4471", corridor: "US → Philippines", amount: 18250, status: "Pending QA", assignee: "You", opened: N - 4 * CM_DAY, controls: ["TM-1", "DOB-3"], disposition: "SAR", rationale: "Funds received from 9 unrelated payers then forwarded within hours; victim-pattern consistent with investment-scam mule.", sarClockStart: N - 4 * CM_DAY,
      dpl: [{ at: N - 4 * CM_DAY, who: "System", act: "Case opened", note: "Oscilar alert: rapid in-out, unrelated payers." }, { at: N - 3.5 * CM_DAY, who: "You", act: "Requested info (tipping-off-safe)", note: "Neutral 'additional review' message; no disclosure." }, { at: N - 3 * CM_DAY, who: "You", act: "Disposition proposed", note: "SAR — investment-scam mule pass-through." }] }),
    C({ id: "CASE-2026-0003", title: "Sub-threshold MFS loads", typology: "4", typName: "Mobile financial services structuring", sev: "P3", source: "Oscilar TM", cust: "CUST-7765", corridor: "US → Bangladesh", amount: 2950, status: "Closed — No SAR", assignee: "You", opened: N - 9 * CM_DAY, controls: ["TM-1", "REP-1"], disposition: "No SAR", rationale: "Pattern explained by documented salary timing; no structuring intent evidenced.", reviewer: "CO (Jason Mullen)", approvedAt: N - 7 * CM_DAY,
      dpl: [{ at: N - 9 * CM_DAY, who: "System", act: "Case opened", note: "Multiple sub-threshold loads." }, { at: N - 8 * CM_DAY, who: "You", act: "Disposition proposed", note: "No SAR — benign explanation evidenced." }, { at: N - 7 * CM_DAY, who: "CO (Jason Mullen)", act: "Four-eyes approved", note: "Concur; close no-SAR." }] }),
    C({ id: "CASE-2026-0004", title: "Possible SDN fuzzy match on beneficiary", typology: "54", typName: "Sanctions & proliferation-financing evasion", sev: "P1", source: "Sanctions screening", cust: "CUST-3120", corridor: "US → UAE", amount: 0, status: "SAR filed", assignee: "You", opened: N - 12 * CM_DAY, controls: ["SANC-1", "SANC-3", "SAR-1"], disposition: "SAR", rationale: "True match confirmed after BO resolution; blocked and reported.", reviewer: "MLRO (Tayel Mohamed)", approvedAt: N - 10 * CM_DAY, sarClockStart: N - 11 * CM_DAY, sarFiled: N - 9 * CM_DAY,
      dpl: [{ at: N - 12 * CM_DAY, who: "System", act: "Case opened", note: "P1 sanctions hold; funds quarantined in Suspense." }, { at: N - 11 * CM_DAY, who: "You", act: "Disposition proposed", note: "SAR + OFAC blocking report." }, { at: N - 10 * CM_DAY, who: "MLRO (Tayel Mohamed)", act: "Four-eyes approved", note: "Confirmed true match." }, { at: N - 9 * CM_DAY, who: "You", act: "SAR filed", note: "Filed via BSA E-Filing; OFAC report within 10 business days." }] }),
    C({ id: "CASE-2026-0005", title: "PEP unexplained wealth — 314(a) subject", typology: "13", typName: "Corruption / PEP proceeds", sev: "P2", source: "314(a)", cust: "CUST-2098", corridor: "US → Egypt", amount: 14000, status: "Investigating", assignee: "You", opened: N - 27 * CM_DAY, controls: ["PEP-2", "EDD-2", "SAR-4"], sarClockStart: N - 27 * CM_DAY,
      dpl: [{ at: N - 27 * CM_DAY, who: "System", act: "Case opened", note: "314(a) subject match; foreign-PEP nexus." }, { at: N - 20 * CM_DAY, who: "You", act: "Reviewed transaction history", note: "Inflows inconsistent with declared role; source-of-wealth requested." }] }),
  ];
  const alerts = [
    { id: "AL-0102", at: N - 2 * CM_HR, source: "Sanctions screening", sev: "P1", typName: "Sanctions & proliferation-financing evasion", typology: "54", cust: "CUST-9043", corridor: "US → UAE", amount: 0, signal: "Fuzzy SDN name match (0.86) on payout beneficiary." },
    { id: "AL-0103", at: N - 5 * CM_HR, source: "Oscilar TM", sev: "P2", typName: "Inbound remittance layering", typology: "3", cust: "CUST-6610", corridor: "US → Bangladesh", amount: 8700, signal: "Volume inconsistent with stated occupation; many-to-one." },
    { id: "AL-0104", at: N - 9 * CM_HR, source: "ACH return", sev: "P2", typName: "Money mules / third-party funded", typology: "39", cust: "CUST-5501", corridor: "US → Philippines", amount: 6200, signal: "R10 unauthorised returns; unrelated payers then forwarded." },
    { id: "AL-0105", at: N - 14 * CM_HR, source: "Oscilar TM", sev: "P3", typName: "Cash structuring (smurfing)", typology: "32", cust: "CUST-7120", corridor: "US → Pakistan", amount: 2880, signal: "Repeated sub-threshold top-ups across agents." },
  ];
  const sars = [{ id: "SAR-2026-0007", case: "CASE-2026-0004", cust: "CUST-3120", typName: "Sanctions evasion", filed: N - 9 * CM_DAY, amount: 0 }];
  return { cases, alerts, sars, seq: 6 };
}

const DPL_ACTS = ["Reviewed transaction history", "Requested info (tipping-off-safe)", "Linked typology", "Linked control", "Interim hold applied", "Note"];

function CaseManagement() {
  const [data, setData] = useState(null);
  const [sub, setSub] = useState("queue");
  const [selId, setSelId] = useState(null);
  const [sevF, setSevF] = useState("All");
  const [statF, setStatF] = useState("All");
  const [dplNote, setDplNote] = useState(""); const [dplAct, setDplAct] = useState(DPL_ACTS[0]);
  const [dispChoice, setDispChoice] = useState("SAR"); const [dispWhy, setDispWhy] = useState("");
  const [reviewerRole, setReviewerRole] = useState("CO (Jason Mullen)");
  const [sarNarr, setSarNarr] = useState("");

  useEffect(() => { (async () => { const o = await cmLoad(); setData(o && o.cases ? o : cmSeed()); })(); }, []);
  useEffect(() => { setDplNote(""); setDispWhy(""); setSarNarr(""); }, [selId]);
  const persist = (next) => { setData(next); cmSave(next); };
  const reloadFromApi = async () => {
    try {
      if (!(await apiAvailable())) return false;
      const apiData = await fetchCasesFromApi();
      setData(prev => { const next = { ...apiData, alerts: prev.alerts }; cmSaveLocal(next); return next; });
      return true;
    } catch { return false; }
  };
  if (!data) return <div className="card">Loading cases…</div>;

  const cases = data.cases, alerts = data.alerts, sars = data.sars;
  const sel = cases.find(c => c.id === selId);
  const openStatuses = ["Open", "Investigating", "Pending QA", "Escalated"];
  const isOpen = (c) => openStatuses.includes(c.status);
  const respDue = (c) => c.opened + (CM_SLA[c.sev] || 24) * CM_HR;
  const respState = (c) => { if (!isOpen(c) || c.status === "Pending QA") return null; const left = respDue(c) - cmNow(); const h = Math.round(left / CM_HR); return { h, over: left < 0, c: left < 0 ? "#ef4444" : left < 4 * CM_HR ? "#f59e0b" : "#17a34a" }; };
  const sarLeft = (c) => { if (!c.sarClockStart || c.sarFiled) return null; const left = c.sarClockStart + 30 * CM_DAY - cmNow(); const d = Math.round(left / CM_DAY); return { d, c: d < 0 ? "#ef4444" : d <= 5 ? "#f59e0b" : "#17a34a" }; };

  const upd = (id, patch, dplEntry) => { const next = { ...data, cases: cases.map(c => c.id === id ? { ...c, ...patch, dpl: dplEntry ? [...c.dpl, dplEntry] : c.dpl } : c) }; persist(next); };
  const openCaseFromAlert = async (al) => {
    const tCtl = (THREAT_ATLAS.typologies.find(t => t.id === al.typology)?.def) || ["TM-1"];
    try {
      if (await apiAvailable()) {
        const created = await apiFetch("/cases", { method: "POST", body: JSON.stringify({ title: al.typName + " — " + al.corridor, severity: al.sev, source: al.source, customerRef: al.cust, corridor: al.corridor, amount: al.amount, typologyId: al.typology, controls: tCtl, note: "Promoted from " + al.source + " alert " + al.id + ": " + al.signal }) });
        const nc = mapCaseFromApi(await apiFetch("/cases/" + encodeURIComponent(created.id), { auth: false }));
        persist({ ...data, cases: [nc, ...cases], alerts: alerts.filter(a => a.id !== al.id), seq: data.seq + 1 });
        setSub("cases"); setSelId(nc.id);
        return;
      }
    } catch (e) {}
    const seq = data.seq + 1;
    const id = "CASE-2026-" + String(seq).padStart(4, "0");
    const nc = { id, title: al.typName + " — " + al.corridor, typology: al.typology, typName: al.typName, sev: al.sev, source: al.source, cust: al.cust, corridor: al.corridor, amount: al.amount, status: "Open", assignee: "", opened: cmNow(), controls: tCtl, disposition: "", rationale: "", reviewer: "", approvedAt: null, sarClockStart: null, sarFiled: null, narrative: "", dpl: [{ at: cmNow(), who: "System", act: "Case opened", note: "Promoted from " + al.source + " alert " + al.id + ": " + al.signal }] };
    persist({ ...data, cases: [nc, ...cases], alerts: alerts.filter(a => a.id !== al.id), seq });
    setSub("cases"); setSelId(id);
  };
  const addDpl = async () => {
    if (!dplNote.trim()) return;
    try {
      if (await apiAvailable()) {
        await apiFetch("/cases/" + encodeURIComponent(sel.id) + "/dpl", { method: "POST", body: JSON.stringify({ action: dplAct, note: dplNote.trim() }) });
        await reloadFromApi();
        setDplNote("");
        return;
      }
    } catch (e) {}
    upd(sel.id, { status: sel.status === "Open" ? "Investigating" : sel.status }, { at: cmNow(), who: "You", act: dplAct, note: dplNote.trim() });
    setDplNote("");
  };
  const propose = async () => {
    if (!dispWhy.trim()) return;
    try {
      if (await apiAvailable()) {
        await apiFetch("/cases/" + encodeURIComponent(sel.id) + "/disposition", { method: "POST", body: JSON.stringify({ disposition: BE_DISP[dispChoice] || dispChoice, rationale: dispWhy.trim() }) });
        await reloadFromApi();
        return;
      }
    } catch (e) {}
    upd(sel.id, { status: "Pending QA", disposition: dispChoice, rationale: dispWhy.trim(), sarClockStart: dispChoice === "SAR" && !sel.sarClockStart ? cmNow() : sel.sarClockStart }, { at: cmNow(), who: "You", act: "Disposition proposed", note: dispChoice + " — " + dispWhy.trim() });
  };
  const approve = async () => {
    try {
      if (await apiAvailable()) {
        await apiFetch("/cases/" + encodeURIComponent(sel.id) + "/approve", { method: "POST", user: API_REVIEWER });
        await reloadFromApi();
        return;
      }
    } catch (e) {}
    const isSar = sel.disposition === "SAR";
    upd(sel.id, { status: isSar ? "Pending QA" : sel.disposition === "Escalate" ? "Escalated" : "Closed — No SAR", reviewer: reviewerRole, approvedAt: cmNow() }, { at: cmNow(), who: reviewerRole, act: "Four-eyes approved", note: "Disposition " + sel.disposition + " approved (maker-checker)." });
  };
  const fileSar = async () => {
    try {
      if (await apiAvailable()) {
        await apiFetch("/cases/" + encodeURIComponent(sel.id) + "/sar", { method: "POST", body: JSON.stringify({ narrative: sarNarr || sel.narrative || "" }), user: API_REVIEWER });
        await reloadFromApi();
        return;
      }
    } catch (e) {}
    const sid = "SAR-2026-" + String(7 + sars.length).padStart(4, "0");
    const next = { ...data, cases: cases.map(c => c.id === sel.id ? { ...c, status: "SAR filed", sarFiled: cmNow(), narrative: sarNarr || c.narrative, dpl: [...c.dpl, { at: cmNow(), who: "You", act: "SAR filed", note: "Filed via BSA E-Filing (" + sid + ")." }] } : c), sars: [{ id: sid, case: sel.id, cust: sel.cust, typName: sel.typName, filed: cmNow(), amount: sel.amount }, ...sars] };
    persist(next);
  };
  const addControl = (cid) => { if (sel.controls.includes(cid)) return; upd(sel.id, { controls: [...sel.controls, cid] }, { at: cmNow(), who: "You", act: "Linked control", note: cid }); };

  function exportCase(c) { try { const wb = XLSX.utils.book_new(); const s = [["Mal — Case File", c.id], ["Title", c.title], ["Severity", c.sev], ["Status", c.status], ["Source", c.source], ["Customer", c.cust], ["Corridor", c.corridor], ["Typology", c.typName], ["Amount", c.amount], ["Opened", cmDate(c.opened)], ["Disposition", c.disposition || "—"], ["Rationale", c.rationale || "—"], ["Reviewer (four-eyes)", c.reviewer || "—"], ["SAR filed", c.sarFiled ? cmDate(c.sarFiled) : "—"], ["Linked controls", c.controls.join(", ")], [], ["Decision Provenance Log"], ["When", "Who", "Action", "Note"]]; c.dpl.forEach(e => s.push([cmDT(e.at), e.who, e.act, e.note])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s), "Case file"); XLSX.writeFile(wb, c.id + ".xlsx"); } catch (e) {} }

  const metrics = { open: cases.filter(isOpen).length, p1: cases.filter(c => isOpen(c) && c.sev === "P1").length, breach: cases.filter(c => { const r = respState(c); return r && r.over; }).length, qa: cases.filter(c => c.status === "Pending QA").length, sarRun: cases.filter(c => c.sarClockStart && !c.sarFiled).length };
  const nearestSar = cases.map(sarLeft).filter(Boolean).sort((a, b) => a.d - b.d)[0];

  // ---------- CASE DETAIL ----------
  if (sel) {
    const r = respState(sel), s = sarLeft(sel);
    const canFile = sel.disposition === "SAR" && sel.reviewer && sel.status !== "SAR filed";
    const typ = THREAT_ATLAS.typologies.find(t => t.id === sel.typology);
    const suggested = (typ?.def || []).filter(id => !sel.controls.includes(id));
    return (<>
      <button className="btn ghost" style={{ marginBottom: 12 }} onClick={() => setSelId(null)}><ChevronLeft size={14} /> Back to cases</button>
      <div className="card" style={{ marginBottom: 13 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
              <span className="chip mono" style={{ background: "#f5f6fb" }}>{sel.id}</span>
              <span className="chip" style={{ background: CM_SEVC[sel.sev] + "22", color: CM_SEVC[sel.sev] }}>{sel.sev}</span>
              <span className="chip" style={{ background: CM_STATC[sel.status] + "22", color: CM_STATC[sel.status] }}>{sel.status}</span>
            </div>
            <h2 style={{ margin: "2px 0", fontSize: 17 }}>{sel.title}</h2>
            <div className="muted" style={{ fontSize: 12.5 }}>{sel.cust} · {sel.corridor} · {sel.source}{sel.amount ? " · $" + sel.amount.toLocaleString() : ""}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {r && <div className="card" style={{ padding: "8px 12px", textAlign: "center", borderColor: r.c + "55" }}><div className="muted" style={{ fontSize: 10 }}>RESPONSE SLA</div><div style={{ color: r.c, fontWeight: 800, fontSize: 15 }}>{r.over ? "Overdue " + (-r.h) + "h" : r.h + "h left"}</div></div>}
            {s && <div className="card" style={{ padding: "8px 12px", textAlign: "center", borderColor: s.c + "55" }}><div className="muted" style={{ fontSize: 10 }}>SAR CLOCK</div><div style={{ color: s.c, fontWeight: 800, fontSize: 15 }}>{s.d < 0 ? "Overdue " + (-s.d) + "d" : s.d + "d left"}</div></div>}
            <button className="btn" onClick={() => exportCase(sel)}><Download size={13} /> Export</button>
          </div>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {typ && <span className="chip" style={{ background: "#fef3c7", color: "#b45309" }}><Flame size={11} /> {sel.typName}</span>}
          {sel.controls.map(cid => { const c = atCtl(cid); return <span key={cid} className="chip" style={{ background: "var(--brand50)", color: "var(--brand600)" }} title={c ? c.requirement : ""}>{cid}</span>; })}
          {suggested.map(cid => <button key={cid} className="btn ghost" style={{ padding: "2px 8px", fontSize: 10.5 }} onClick={() => addControl(cid)}><Plus size={10} /> {cid}</button>)}
        </div>
        {sel.assignee !== "You" && sel.status === "Open" && <button className="btn gold" style={{ marginTop: 10 }} onClick={() => upd(sel.id, { assignee: "You", status: "Investigating" }, { at: cmNow(), who: "You", act: "Note", note: "Assigned to self; investigation started." })}><UserPlus size={13} /> Assign to me & start</button>}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr", gap: 13, alignItems: "start" }}>
        {/* DPL timeline */}
        <div className="card"><h3>Decision Provenance Log</h3>
          <div style={{ borderLeft: "2px solid var(--line)", paddingLeft: 13, marginLeft: 4 }}>
            {sel.dpl.map((e, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 12 }}>
                <span style={{ position: "absolute", left: -19, top: 3, width: 8, height: 8, borderRadius: 8, background: "var(--brand)" }} />
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 12.5 }}>{e.act}</b><span className="muted" style={{ fontSize: 11 }}>{e.who} · {cmDT(e.at)}</span></div>
                <div className="muted" style={{ fontSize: 12 }}>{e.note}</div>
              </div>
            ))}
          </div>
          {sel.status !== "SAR filed" && sel.status !== "Closed — No SAR" && (
            <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 11 }}>
              <div className="row" style={{ gap: 7, flexWrap: "wrap" }}>
                <select value={dplAct} onChange={e => setDplAct(e.target.value)} style={{ width: "auto", minWidth: 150 }}>{DPL_ACTS.map(a => <option key={a}>{a}</option>)}</select>
                <input value={dplNote} onChange={e => setDplNote(e.target.value)} placeholder="Add an investigation note (tipping-off-safe)…" style={{ width: "auto", flex: 1, minWidth: 180, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 9, fontFamily: "var(--sans)", fontSize: 12.5 }} />
                <button className="btn" onClick={addDpl}><Plus size={13} /> Log</button>
              </div>
            </div>
          )}
        </div>

        {/* Disposition / four-eyes / SAR */}
        <div>
          <div className="card" style={{ marginBottom: 13 }}><h3>Disposition</h3>
            {sel.disposition ? (
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 6 }}><span className="chip" style={{ background: (sel.disposition === "SAR" ? "#b91c1c" : sel.disposition === "Escalate" ? "#ef4444" : "#64748b") + "22", color: sel.disposition === "SAR" ? "#b91c1c" : sel.disposition === "Escalate" ? "#ef4444" : "#64748b" }}>{sel.disposition}</span><span className="muted" style={{ fontSize: 12 }}>{sel.rationale}</span></div>
            ) : <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>No disposition yet.</div>}
            {!sel.disposition || (sel.status !== "Pending QA" && !sel.reviewer && sel.status !== "SAR filed" && sel.status !== "Closed — No SAR") ? (
              <>
                <div className="row" style={{ gap: 6, marginBottom: 8 }}>{["SAR", "No SAR", "Escalate"].map(x => <button key={x} className="btn ghost" style={{ padding: "4px 11px", fontSize: 12, borderColor: dispChoice === x ? "var(--brand)" : "var(--line)", color: dispChoice === x ? "var(--brand600)" : undefined }} onClick={() => setDispChoice(x)}>{x}</button>)}</div>
                <textarea value={dispWhy} onChange={e => setDispWhy(e.target.value)} placeholder="Rationale (becomes part of the case record)…" style={{ minHeight: 60, marginBottom: 8 }} />
                <button className="btn gold" onClick={propose} disabled={!dispWhy.trim()}><Send size={13} /> Propose disposition</button>
              </>
            ) : null}
          </div>

          {sel.status === "Pending QA" && (
            <div className="card" style={{ marginBottom: 13, borderColor: "var(--amber)" }}><h3><Lock size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Four-eyes review</h3>
              <div className="muted" style={{ fontSize: 12, marginBottom: 9 }}>Maker-checker: the reviewer must be a different person from the investigator. The SAR cannot be filed until an independent reviewer approves.</div>
              <div className="row" style={{ gap: 7, flexWrap: "wrap" }}>
                <select value={reviewerRole} onChange={e => setReviewerRole(e.target.value)} style={{ width: "auto", minWidth: 170 }}><option>CO (Jason Mullen)</option><option>MLRO (Tayel Mohamed)</option></select>
                <button className="btn gold" onClick={approve}><Check size={13} /> Approve as reviewer</button>
              </div>
            </div>
          )}
          {sel.reviewer && <div className="card" style={{ marginBottom: 13 }}><div className="row" style={{ gap: 8 }}><ShieldCheck size={15} color="var(--green)" /><span style={{ fontSize: 12.5 }}>Four-eyes approved by <b>{sel.reviewer}</b> · {cmDT(sel.approvedAt)}</span></div></div>}

          {sel.disposition === "SAR" && (
            <div className="card"><h3>SAR package</h3>
              {!sel.reviewer ? <div className="muted" style={{ fontSize: 12.5 }}>Locked until four-eyes approval.</div> : (<>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>Subject {sel.cust} · {sel.typName} · {sel.corridor}{sel.amount ? " · $" + sel.amount.toLocaleString() : ""} · supporting: {sel.dpl.length} DPL entries, {sel.controls.length} controls.</div>
                <textarea value={sarNarr || sel.narrative || `Subject ${sel.cust} (${sel.corridor}) conducted activity consistent with ${sel.typName}. ${sel.rationale} Activity was detected via ${sel.source} and investigated under the case record below.`} onChange={e => setSarNarr(e.target.value)} style={{ minHeight: 96, marginBottom: 9 }} />
                {sel.status === "SAR filed" ? <span className="chip" style={{ background: "#b91c1c22", color: "#b91c1c" }}><Check size={11} /> Filed {cmDate(sel.sarFiled)}</span> : <button className="btn gold" onClick={fileSar} disabled={!canFile}><Send size={13} /> Mark SAR filed (BSA E-Filing)</button>}
              </>)}
            </div>
          )}
        </div>
      </div>
    </>);
  }

  // ---------- LIST VIEWS ----------
  const SUBS = [["queue", "Queue & SLA", Activity], ["cases", "Cases", FolderOpen], ["sars", "SAR register", Send]];
  const fcases = cases.filter(c => (sevF === "All" || c.sev === sevF) && (statF === "All" || c.status === statF));
  return (<>
    <h1 className="h1">Case Management</h1>
    <p className="sub">The operational financial-crime workflow: alert → case → investigation (decision-provenance log) → disposition → four-eyes review → SAR package, with response and 30-day SAR SLA clocks. Each case links to its Threat Atlas typology and the controls that govern it. Customer references are pseudonymous; communications are tipping-off-safe.</p>

    <div className="row" style={{ gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
      {SUBS.map(([id, label, Ic]) => <button key={id} className={"btn" + (sub === id ? " gold" : " ghost")} onClick={() => setSub(id)}><Ic size={13} /> {label}</button>)}
    </div>

    {sub === "queue" && (<>
      <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 13 }}>
        <Kpi label="Open cases" value={metrics.open} />
        <Kpi label="P1 open" value={metrics.p1} accent={metrics.p1 ? "var(--red)" : "var(--green)"} />
        <Kpi label="SLA breaches" value={metrics.breach} accent={metrics.breach ? "var(--red)" : "var(--green)"} />
        <Kpi label="Awaiting four-eyes" value={metrics.qa} accent={metrics.qa ? "var(--amber)" : "var(--green)"} />
        <Kpi label="SAR clocks running" value={metrics.sarRun} sub={nearestSar ? (nearestSar.d < 0 ? "nearest overdue" : "nearest " + nearestSar.d + "d") : ""} accent={nearestSar && nearestSar.d <= 5 ? "var(--red)" : "var(--brand600)"} />
      </div>
      <div className="card"><h3>Alert intake — promote to a case</h3>
        {alerts.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>No alerts in the queue.</div> : alerts.map(a => (
          <div key={a.id} className="row" style={{ justifyContent: "space-between", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <span className="chip" style={{ background: CM_SEVC[a.sev] + "22", color: CM_SEVC[a.sev] }}>{a.sev}</span>
              <span className="chip mono" style={{ background: "#f5f6fb" }}>{a.id}</span>
              <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.typName} · {a.corridor}</div><div className="muted" style={{ fontSize: 11.5 }}>{a.cust} · {a.source} · {a.signal}</div></div>
            </div>
            <button className="btn gold" onClick={() => openCaseFromAlert(a)}><Plus size={13} /> Open case</button>
          </div>
        ))}
      </div>
    </>)}

    {sub === "cases" && (<>
      <div className="card" style={{ marginBottom: 13 }}><div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select value={sevF} onChange={e => setSevF(e.target.value)} style={{ width: "auto", minWidth: 110 }}><option value="All">All severities</option>{["P1", "P2", "P3"].map(s => <option key={s}>{s}</option>)}</select>
        <select value={statF} onChange={e => setStatF(e.target.value)} style={{ width: "auto", minWidth: 150 }}><option value="All">All statuses</option>{Object.keys(CM_STATC).map(s => <option key={s}>{s}</option>)}</select>
        <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>{fcases.length} cases</span>
      </div></div>
      <div className="tablewrap"><table>
        <thead><tr><th>Case</th><th>Sev</th><th>Typology</th><th>Corridor</th><th>Status</th><th>Response SLA</th><th>SAR clock</th><th></th></tr></thead>
        <tbody>{fcases.map(c => { const r = respState(c), s = sarLeft(c); return (
          <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelId(c.id)}>
            <td className="mono">{c.id}</td>
            <td><span className="chip" style={{ background: CM_SEVC[c.sev] + "22", color: CM_SEVC[c.sev] }}>{c.sev}</span></td>
            <td>{c.typName}</td><td className="muted">{c.corridor}</td>
            <td><span className="chip" style={{ background: CM_STATC[c.status] + "22", color: CM_STATC[c.status] }}>{c.status}</span></td>
            <td>{r ? <span style={{ color: r.c, fontWeight: 700, fontSize: 12 }}>{r.over ? "Overdue" : r.h + "h"}</span> : <span className="muted">—</span>}</td>
            <td>{s ? <span style={{ color: s.c, fontWeight: 700, fontSize: 12 }}>{s.d < 0 ? "Overdue" : s.d + "d"}</span> : <span className="muted">—</span>}</td>
            <td><ChevronRight size={15} className="muted" /></td>
          </tr>
        ); })}</tbody>
      </table></div>
    </>)}

    {sub === "sars" && (
      <div className="card"><h3>SAR register</h3>
        {sars.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>No SARs filed yet.</div> :
          <div className="tablewrap"><table>
            <thead><tr><th>SAR</th><th>Case</th><th>Subject</th><th>Typology</th><th>Filed</th></tr></thead>
            <tbody>{sars.map(s => <tr key={s.id}><td className="mono">{s.id}</td><td className="mono">{s.case}</td><td>{s.cust}</td><td>{s.typName}</td><td className="muted">{cmDate(s.filed)}</td></tr>)}</tbody>
          </table></div>}
        <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>SAR confidentiality: filings are access-restricted and never disclosed to the subject; retained five years from filing.</div>
      </div>
    )}

    <div className="card" style={{ marginTop: 13 }}><div className="row" style={{ gap: 8, alignItems: "flex-start" }}><CircleAlert size={14} className="muted" style={{ marginTop: 1 }} /><span className="muted" style={{ fontSize: 11.5 }}>Demonstrator: alerts and cases are seeded and stored in this browser. In production, alerts arrive from Oscilar/screening, SAR filing posts to FinCEN BSA E-Filing, maker-checker is enforced by role-based access (reviewer ≠ investigator), and every action writes to a tamper-evident audit log.</span></div></div>
  </>);
}


/* ============================================================================
   REGULATORY CHANGE -> IMPACT MAPPING  (Ascent / TR Regulatory Intelligence)
   A governed, source-cited change feed (FinCEN / OFAC / FATF / corridor
   regulators) mapped to the controls (Step 1) and typologies it touches, with
   auto-raised remediation tasks + SLA. Each impacted control shows its CURRENT
   status pulled from the live Control Register. Curated/seeded demonstrator.
============================================================================ */
const RT_KEY = "mal_regtasks_v1";
const RC_SRCC = { FinCEN: "#1e63e9", OFAC: "#dc2626", FATF: "#7c3aed", Treasury: "#0891b2", Interagency: "#ea580c", SBP: "#16a34a", BSP: "#16a34a", MAS: "#16a34a", CBUAE: "#16a34a", Visa: "#f59e0b", Congress: "#6a00d6" };
const RC_TYPEC = { Designation: "#dc2626", Rule: "#1e63e9", Advisory: "#f59e0b", Guidance: "#0891b2", Enforcement: "#b91c1c", "Risk assessment": "#7c3aed", Deadline: "#ea580c" };
const RC_SEVC = { high: "#ef4444", med: "#f59e0b", low: "#1e63e9" };
const RC_SLA = { high: 30, med: 60, low: 90 };
async function rtLoadLocal() { try { if (window.storage) { const r = await window.storage.get(RT_KEY); if (r && r.value) return JSON.parse(r.value); } } catch (e) {} return null; }
async function rtSaveLocal(o) { try { if (window.storage) await window.storage.set(RT_KEY, JSON.stringify(o)); } catch (e) {} }
async function rtLoad() {
  try {
    if (await apiAvailable()) {
      const rows = await apiFetch("/reg-changes", { auth: false });
      const rt = {};
      rows.forEach(r => { if (r.task) rt[r.id] = FE_TASK_STATUS[r.task.status] || r.task.status; });
      await rtSaveLocal(rt);
      return rt;
    }
  } catch (e) {}
  return rtLoadLocal();
}
async function rtSave(o) { await rtSaveLocal(o); }
async function rtSyncTask(id, status) {
  try {
    if (await apiAvailable())
      await apiFetch("/reg-changes/" + encodeURIComponent(id) + "/task", { method: "PATCH", body: JSON.stringify({ status: BE_TASK_STATUS[status] || status }) });
  } catch (e) {}
}

const REG_CHANGES = [
  { id: "RC-01", src: "OFAC", type: "Rule", jur: "United States", date: "Standing", ago: 8, sev: "high", title: "50% Rule — entities owned 50%+ by SDNs are themselves blocked", summary: "Aggregate ownership across blocked persons must be computed; an entity need not be listed to be blocked. Confirm beneficial-ownership resolution feeds screening.", action: "Verify 50%-rule aggregation logic and BO-to-screening linkage; run a seeded ownership test.", owner: "US BSA CO (Jason Mullen)", controls: ["SANC-1", "SANC-3", "CDD-2"], typologies: ["52", "54"] },
  { id: "RC-02", src: "FATF", type: "Guidance", jur: "Global", date: "R.16 revised", ago: 20, sev: "high", title: "Travel Rule (Rec. 16) — originator/beneficiary data on transmittals", summary: "Required originator and beneficiary information must travel with transmittals to the receiving institution; sunrise gaps across corridors remain a control risk.", action: "Confirm Travel Rule payload completeness on SwiftX/Thunes legs at the $3,000 threshold.", owner: "FinCrime Ops", controls: ["REP-2", "SANC-1"], typologies: ["3", "34"] },
  { id: "RC-03", src: "FinCEN", type: "Advisory", jur: "United States", date: "FIN-2023-Alert [VERIFY]", ago: 12, sev: "high", title: "Pig-butchering / SE-Asia investment-scam money mules", summary: "Advisory on virtual-currency investment scams run from SE-Asia scam centres; victim funds move through US mule accounts and MSB rails.", action: "Tune mule typology rules (rapid in-out, unrelated payers); incorporate advisory into training within 30 days.", owner: "FinCrime Ops", controls: ["TM-1", "DOB-3", "TRN-3"], typologies: ["14", "35"] },
  { id: "RC-04", src: "Treasury", type: "Risk assessment", jur: "United States", date: "2026 NMLRA (Mar 2026) [VERIFY]", ago: 40, sev: "high", title: "2026 National ML Risk Assessment — MSBs, mules & funnel accounts Critical", summary: "Fraud, money mules, MSBs and funnel accounts rated top ML threats (per the register incorporated in this workbook). Reassess inherent risk and monitoring coverage.", action: "Refresh enterprise risk assessment against the 2026 NMLRA threat areas; map each to a control.", owner: "MLRO (Tayel Mohamed)", controls: ["RA-1", "RA-2", "TM-1"], typologies: ["4", "32"] },
  { id: "RC-05", src: "Treasury", type: "Risk assessment", jur: "United States", date: "2026 NPFRA (Mar 2026) [VERIFY]", ago: 38, sev: "high", title: "2026 Proliferation-Financing RA — DPRK/Iran via DASPs & shells", summary: "DPRK rated top PF threat (digital-asset heists); Iran shadow-banking shells. Sanctioned-nexus and dual-use trade exposure for the settlement leg.", action: "Confirm crypto/wallet OFAC screening on the USDC settlement leg; dual-use & front-company red flags in TM.", owner: "US BSA CO (Jason Mullen)", controls: ["SANC-1", "SANC-2", "TM-1"], typologies: ["54", "47"] },
  { id: "RC-06", src: "OFAC", type: "Deadline", jur: "United States", date: "Annual — 30 Sep", ago: 3, sev: "high", title: "Annual Report of Blocked Property (ARBP) — due 30 September", summary: "ARBP filed by 30 September for property held as of 30 June (31 CFR 501.603). Reconcile blocked property to the segregated account and ledger.", action: "Prepare and file ARBP; reconcile to SaaScada ledger; CO sign-off.", owner: "US BSA CO (Jason Mullen)", controls: ["SANC-3"], typologies: [] },
  { id: "RC-07", src: "FinCEN", type: "Guidance", jur: "United States", date: "Biweekly", ago: 6, sev: "med", title: "Section 314(a) information requests — biweekly cadence", summary: "314(a) lists are issued on a recurring cadence; required records must be searched within the mandated period and kept confidential.", action: "Confirm 314(a) search workflow runs each cycle within SLA; positive-match escalation to CO.", owner: "US BSA CO (Jason Mullen)", controls: ["SAR-4"], typologies: ["13"] },
  { id: "RC-08", src: "Interagency", type: "Guidance", jur: "United States", date: "FIL-29-2023", ago: 28, sev: "med", title: "2023 Interagency Guidance on Third-Party Relationships", summary: "Full vendor lifecycle (planning, DD, contracting, ongoing monitoring, termination) expected for all partners touching funds/data. Processor non-reliance.", action: "Confirm quarterly partner scorecards and non-discretionary termination triggers are operating.", owner: "Back-Office Ops + MLRO", controls: ["TPO-1", "TPO-2", "TPO-3"], typologies: [] },
  { id: "RC-09", src: "SBP", type: "Rule", jur: "Pakistan", date: "AML/CFT/CPF Regs [VERIFY]", ago: 18, sev: "high", title: "SBP AML/CFT regulations & PKR 2,000,000 CTR threshold", summary: "State Bank of Pakistan rules govern the live corridor; agent-network controls, no hawala/hundi settlement, Travel-Rule data quality on payout.", action: "Re-confirm SwiftX agent OFAC/background checks (≤3y) and no-IVTS-settlement attestation.", owner: "FinCrime Ops", controls: ["TPO-4", "REP-1"], typologies: ["28", "34"] },
  { id: "RC-10", src: "FATF", type: "Guidance", jur: "Pakistan", date: "APG MER follow-up [VERIFY]", ago: 45, sev: "med", title: "FATF/APG — Pakistan corridor risk (post grey-list)", summary: "Corridor risk is classified on internal assessment independent of FATF list status; TF and hawala prevalence keep Pakistan Very High internally.", action: "Revalidate the Pakistan corridor addendum and province-level weighting.", owner: "MLRO (Tayel Mohamed)", controls: ["RA-3", "TPO-4"], typologies: ["28", "29"] },
  { id: "RC-11", src: "Congress", type: "Rule", jur: "United States", date: "GENIUS Act 2025 [VERIFY]", ago: 33, sev: "med", title: "GENIUS Act 2025 — stablecoin / USDC settlement leg", summary: "Permitted-issuer stablecoins, lawful-order freeze/seize capability, no yield to customers. Governs the internal USDC settlement/treasury leg via Rain.", action: "Confirm permitted-issuer status, freeze/seize capability, and perimeter position with counsel.", owner: "MLRO (Tayel Mohamed)", controls: ["TPO-2", "SANC-1"], typologies: ["47"] },
  { id: "RC-12", src: "FinCEN", type: "Rule", jur: "United States", date: "Every 2 years", ago: 5, sev: "low", title: "MSB registration renewal & 30-day advisory incorporation", summary: "FinCEN MSB registration renews on a 2-year cycle; advisories must be incorporated into rules and training within 30 days of material publication.", action: "Confirm registration currency; verify the 30-day advisory-incorporation control operates.", owner: "MLRO + Legal", controls: ["REG-1", "TRN-3"], typologies: [] },
  { id: "RC-13", src: "Visa", type: "Rule", jur: "Global", date: "Core Rules [VERIFY]", ago: 22, sev: "low", title: "Visa Core Rules — issuer fraud & dispute monitoring thresholds", summary: "Issuer fraud-rate and dispute-rate programme thresholds; breaches escalate to the partner governance forum (Rain).", action: "Confirm card-monitoring thresholds and Rain scorecard cover Visa programme limits.", owner: "FinCrime Ops + Engineering", controls: ["TM-1", "TPO-3"], typologies: ["36"] },
  { id: "RC-14", src: "OFAC", type: "Designation", jur: "United States", date: "Rolling SDN updates", ago: 1, sev: "high", title: "SDN list updates — Russia / DPRK / Iran designations (rolling)", summary: "OFAC adds SDN entries on a rolling basis; deltas must be live in screening within 24h (others 48h) with full-base batch re-screen.", action: "Confirm 24h SDN load SLA and automatic batch re-screen on the latest update.", owner: "US BSA CO (Jason Mullen)", controls: ["SANC-1", "SANC-2"], typologies: ["54"] },
];

function RegChange() {
  const [sub, setSub] = useState("feed");
  const [rt, setRt] = useState({});
  const [crOv, setCrOv] = useState({});
  const [srcF, setSrcF] = useState("All");
  const [sevF, setSevF] = useState("All");
  const [openId, setOpenId] = useState(null);

  useEffect(() => { (async () => { const a = await rtLoad(); if (a) setRt(a); const b = await crLoad(); if (b) setCrOv(b); })(); }, []);

  const DAY = 864e5, now = Date.now();
  const taskOf = (rc) => { const published = now - rc.ago * DAY; const due = published + (RC_SLA[rc.sev]) * DAY; const daysLeft = Math.round((due - now) / DAY); const seed = crHash(rc.id) % 100; const od = daysLeft < 0; const status = rt[rc.id] || (od ? (seed < 50 ? "Open" : "In progress") : seed < 33 ? "Done" : seed < 66 ? "In progress" : "Open"); return { due, daysLeft, status, overdue: status !== "Done" && od }; };
  const ctlStatus = (id) => { const c = atCtl(id); if (!c) return null; const o = crOv[id]; return o && o.status ? o.status : crSeedOne(c).status; };

  const setTask = (id, status) => { setRt(o => { const no = { ...o, [id]: status }; rtSave(no); return no; }); rtSyncTask(id, status); };

  const rows = REG_CHANGES.map(rc => ({ ...rc, t: taskOf(rc) }));
  const open = rows.filter(r => r.t.status !== "Done");
  const overdue = rows.filter(r => r.t.overdue);
  const high = rows.filter(r => r.sev === "high");
  const ctlSet = new Set(REG_CHANGES.flatMap(r => r.controls));
  const filtered = rows.filter(r => (srcF === "All" || r.src === srcF) && (sevF === "All" || r.sev === sevF)).sort((a, b) => a.ago - b.ago);

  // control impact map
  const ctlMap = {};
  REG_CHANGES.forEach(rc => rc.controls.forEach(id => { (ctlMap[id] = ctlMap[id] || []).push(rc.id); }));
  const ctlRows = Object.entries(ctlMap).map(([id, ids]) => ({ id, ctl: atCtl(id), n: ids.length, status: ctlStatus(id) })).sort((a, b) => b.n - a.n);

  const dn = (id) => AML_FRAMEWORK.domains.find(x => x.id === id)?.name || id;
  const SUBS = [["feed", "Change feed", Megaphone], ["tasks", "Impact tasks", ClipboardCheck], ["map", "Control impact map", ShieldCheck]];
  const typName = (id) => THREAT_ATLAS.typologies.find(t => t.id === id)?.name;

  function exportXlsx() { try { const wb = XLSX.utils.book_new(); const a = [["ID", "Source", "Type", "Jurisdiction", "Date", "Impact", "Title", "Action required", "Owner", "Controls", "Task status", "Due"]]; rows.forEach(r => a.push([r.id, r.src, r.type, r.jur, r.date, r.sev, r.title, r.action, r.owner, r.controls.join(", "), r.t.status, new Date(r.t.due).toLocaleDateString("en-GB")])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), "Reg change register"); XLSX.writeFile(wb, "Mal_Reg_Change_Register.xlsx"); } catch (e) {} }

  return (<>
    <h1 className="h1">Regulatory Change & Impact</h1>
    <p className="sub">A governed, source-cited register of regulatory developments — FinCEN, OFAC, FATF and corridor regulators — each mapped to the Mal controls and typologies it touches, with auto-raised remediation tasks and SLA. Impacted controls show their current status from the live Control Register, so a change hitting a gap rises to the top.</p>

    <div className="row" style={{ gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
      {SUBS.map(([id, label, Ic]) => <button key={id} className={"btn" + (sub === id ? " gold" : " ghost")} onClick={() => setSub(id)}><Ic size={13} /> {label}</button>)}
      <span className="spacer" />
      <button className="btn" onClick={exportXlsx}><Download size={13} /> Export</button>
    </div>

    <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 13 }}>
      <Kpi label="Tracked changes" value={REG_CHANGES.length} />
      <Kpi label="High impact" value={high.length} accent="var(--red)" />
      <Kpi label="Open tasks" value={open.length} accent={open.length ? "var(--amber)" : "var(--green)"} />
      <Kpi label="Overdue tasks" value={overdue.length} accent={overdue.length ? "var(--red)" : "var(--green)"} />
      <Kpi label="Controls impacted" value={ctlSet.size + "/" + AML_FRAMEWORK.controls.length} accent="var(--brand600)" />
    </div>

    {/* FEED */}
    {sub === "feed" && (<>
      <div className="card" style={{ marginBottom: 13 }}><div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select value={srcF} onChange={e => setSrcF(e.target.value)} style={{ width: "auto", minWidth: 130 }}><option value="All">All sources</option>{[...new Set(REG_CHANGES.map(r => r.src))].map(s => <option key={s}>{s}</option>)}</select>
        <select value={sevF} onChange={e => setSevF(e.target.value)} style={{ width: "auto", minWidth: 120 }}><option value="All">All impact</option><option value="high">High</option><option value="med">Medium</option><option value="low">Low</option></select>
        <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>{filtered.length} changes · newest first</span>
      </div></div>
      <div className="grid" style={{ gap: 11 }}>
        {filtered.map(r => { const op = openId === r.id; return (
          <div key={r.id} className="card" style={{ padding: 14, borderLeft: `3px solid ${RC_SEVC[r.sev]}` }}>
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <span className="chip" style={{ background: (RC_SRCC[r.src] || "#64748b") + "22", color: RC_SRCC[r.src] || "#64748b" }}>{r.src}</span>
              <span className="chip" style={{ background: (RC_TYPEC[r.type] || "#64748b") + "18", color: RC_TYPEC[r.type] || "#64748b" }}>{r.type}</span>
              <span className="chip" style={{ background: "#f5f6fb" }}>{r.jur}</span>
              <span className="chip" style={{ background: RC_SEVC[r.sev] + "18", color: RC_SEVC[r.sev] }}>{r.sev} impact</span>
              <span className="muted" style={{ fontSize: 11, alignSelf: "center" }}>{r.date}</span>
              <span className="spacer" />
              <span className="chip" style={{ background: (r.t.status === "Done" ? "#17a34a" : r.t.overdue ? "#ef4444" : "#f59e0b") + "22", color: r.t.status === "Done" ? "#17a34a" : r.t.overdue ? "#ef4444" : "#f59e0b" }}>{r.t.status === "Done" ? "Task done" : r.t.overdue ? "Task overdue" : "Task " + r.t.daysLeft + "d"}</span>
            </div>
            <b style={{ fontSize: 13.5 }}>{r.title}</b>
            <div className="muted" style={{ fontSize: 12.5, margin: "5px 0 8px" }}>{r.summary}</div>
            <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
              {r.controls.map(id => { const st = ctlStatus(id); return <span key={id} className="chip" style={{ background: "var(--brand50)", color: "var(--brand600)" }} title={(atCtl(id)?.requirement || "") + " · current: " + st}>{id}{st === "Gap" || st === "Not implemented" ? " ⚠" : ""}</span>; })}
              {r.typologies.map(id => <span key={id} className="chip" style={{ background: "#fef3c7", color: "#b45309" }} title={typName(id)}><Flame size={10} /> {typName(id)}</span>)}
            </div>
            <button className="btn ghost" style={{ marginTop: 9, padding: "4px 11px", fontSize: 11.5 }} onClick={() => setOpenId(op ? null : r.id)}>{op ? "Hide" : "Action required + impacted controls"}</button>
            {op && (<div style={{ marginTop: 10 }}>
              <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Action required · owner {r.owner}</div>
              <div style={{ fontSize: 12.5, marginBottom: 9 }}>{r.action}</div>
              <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Impacted controls (current status)</div>
              {r.controls.map(id => { const st = ctlStatus(id); const c = atCtl(id); return (
                <div key={id} className="row" style={{ gap: 8, padding: "3px 0", fontSize: 12 }}>
                  <span className="chip mono" style={{ background: "#f5f6fb" }}>{id}</span>
                  <span style={{ flex: 1 }}>{c ? c.requirement : id}</span>
                  <span className="chip" style={{ background: (CR_STATC[st] || "#64748b") + "22", color: CR_STATC[st] || "#64748b" }}>{st}</span>
                </div>
              ); })}
              <div className="row" style={{ gap: 6, marginTop: 10 }}>
                <span className="muted" style={{ fontSize: 11.5, alignSelf: "center" }}>Remediation task:</span>
                {["Open", "In progress", "Done"].map(s => <button key={s} className="btn ghost" style={{ padding: "3px 10px", fontSize: 11, borderColor: r.t.status === s ? "var(--brand)" : "var(--line)", color: r.t.status === s ? "var(--brand600)" : undefined }} onClick={() => setTask(r.id, s)}>{s}</button>)}
              </div>
            </div>)}
          </div>
        ); })}
      </div>
    </>)}

    {/* TASKS */}
    {sub === "tasks" && (
      <div className="card"><h3>Auto-raised remediation tasks</h3>
        <div className="tablewrap"><table>
          <thead><tr><th>Change</th><th>Action</th><th>Owner</th><th>Impact</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>{[...rows].sort((a, b) => a.t.daysLeft - b.t.daysLeft).map(r => (
            <tr key={r.id}>
              <td className="mono">{r.id}</td>
              <td style={{ minWidth: 240 }}>{r.action}</td>
              <td className="muted">{r.owner}</td>
              <td><span className="chip" style={{ background: RC_SEVC[r.sev] + "22", color: RC_SEVC[r.sev] }}>{r.sev}</span></td>
              <td><span className="chip" style={{ background: (r.t.overdue ? "#ef4444" : "#64748b") + "18", color: r.t.overdue ? "#ef4444" : "#64748b" }}>{new Date(r.t.due).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}{r.t.status !== "Done" ? (r.t.overdue ? " · overdue" : " · " + r.t.daysLeft + "d") : ""}</span></td>
              <td><span className="chip" style={{ background: (r.t.status === "Done" ? "#17a34a" : r.t.status === "In progress" ? "#8000ff" : "#f59e0b") + "22", color: r.t.status === "Done" ? "#17a34a" : r.t.status === "In progress" ? "#8000ff" : "#f59e0b" }}>{r.t.status}</span></td>
              <td><div className="row" style={{ gap: 4 }}>{["Open", "In progress", "Done"].map(s => <button key={s} className="btn ghost" style={{ padding: "2px 7px", fontSize: 10 }} onClick={() => setTask(r.id, s)}>{s[0]}{s === "In progress" ? "IP" : ""}</button>)}</div></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    )}

    {/* CONTROL IMPACT MAP */}
    {sub === "map" && (
      <div className="card"><h3>Which controls are under regulatory pressure</h3>
        <div className="muted" style={{ fontSize: 12, marginBottom: 11 }}>Controls touched by the most recent changes, with their current status from the Control Register. A control under pressure that is also a gap is the priority.</div>
        <div className="tablewrap"><table>
          <thead><tr><th>Control</th><th>Domain</th><th>Changes</th><th>Current status</th><th>Driving changes</th></tr></thead>
          <tbody>{ctlRows.map(r => (
            <tr key={r.id}>
              <td><span className="chip mono" style={{ background: "#f5f6fb" }}>{r.id}</span> {r.ctl ? r.ctl.requirement : ""}</td>
              <td className="muted">{r.ctl ? dn(r.ctl.domain) : ""}</td>
              <td><b>{r.n}</b></td>
              <td><span className="chip" style={{ background: (CR_STATC[r.status] || "#64748b") + "22", color: CR_STATC[r.status] || "#64748b" }}>{r.status}{r.status === "Gap" || r.status === "Not implemented" ? " ⚠" : ""}</span></td>
              <td className="muted mono" style={{ fontSize: 11 }}>{ctlMap[r.id].join(", ")}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    )}

    <div className="card" style={{ marginTop: 13 }}><div className="row" style={{ gap: 8, alignItems: "flex-start" }}><CircleAlert size={14} className="muted" style={{ marginTop: 1 }} /><span className="muted" style={{ fontSize: 11.5 }}>This is the <b>governed, source-cited</b> record that drives remediation — distinct from the live online ticker, which is unverified horizon-scanning. Entries are a curated demonstrator seed; dates marked [VERIFY] are time-sensitive. In production this is fed by official FinCEN / OFAC / FATF / regulator feeds and each item is confirmed at source before a task is raised.</span></div></div>
  </>);
}


/* ============================================================================
   FRAMEWORK CROSSWALK  — map Mal controls once to BSA pillars / FATF 40 /
   Wolfsberg, with live coverage pulled from the Control Register. "Assess
   once, satisfy many."
============================================================================ */
const FATF_RECS = { "R.1": "Risk assessment & risk-based approach", "R.6": "Targeted financial sanctions — terrorism/TF", "R.7": "Targeted financial sanctions — proliferation", "R.10": "Customer due diligence", "R.11": "Record-keeping", "R.12": "Politically exposed persons", "R.15": "New technologies", "R.16": "Wire transfers (Travel Rule)", "R.17": "Reliance on third parties", "R.18": "Internal controls", "R.20": "Reporting of suspicious transactions", "R.21": "Tipping-off & confidentiality", "R.26": "Regulation & supervision", "R.34": "Guidance & feedback" };
const FW_MAP = (dom) => ({
  REG: ["Programme rules (31 CFR 1022)", ["R.26", "R.34"], "Programme governance & oversight"],
  GOV: ["Pillar 2 — Designated compliance officer", ["R.18", "R.1"], "Programme governance & oversight"],
  RA: ["Risk-based approach", ["R.1"], "Risk assessment"],
  CDD: ["CDD / CIP (5th pillar)", ["R.10"], "CDD / KYC"],
  EDD: ["CDD / CIP (5th pillar)", ["R.10"], "Enhanced due diligence"],
  OM: ["CDD / CIP (5th pillar)", ["R.10"], "CDD / KYC"],
  TM: ["Pillar 1 — Internal controls", ["R.20"], "Transaction monitoring"],
  SANC: ["OFAC sanctions programme", ["R.6", "R.7"], "Sanctions screening"],
  PEP: ["CDD / CIP (5th pillar)", ["R.12"], "PEPs"],
  SAR: ["Reporting (SAR/CTR/OFAC)", ["R.20", "R.21"], "Suspicious activity reporting"],
  REP: ["Reporting (SAR/CTR/OFAC)", ["R.16"], "Wire transfers / Travel Rule"],
  REC: ["Recordkeeping", ["R.11"], "Record retention"],
  TRN: ["Pillar 3 — Ongoing training", ["R.18"], "Training & awareness"],
  AUD: ["Pillar 4 — Independent testing", ["R.18"], "Independent testing"],
  TPO: ["Third-party / vendor risk", ["R.17"], "Third-party / correspondent"],
  DOB: ["CDD / CIP (5th pillar)", ["R.10", "R.15"], "CDD / KYC"],
  ESC: ["Pillar 1 — Internal controls", ["R.18"], "Programme governance & oversight"],
}[dom] || ["Pillar 1 — Internal controls", ["R.18"], "Programme governance & oversight"]);

function FrameworkCrosswalk() {
  const [fw, setFw] = useState("BSA");
  const [crOv, setCrOv] = useState({});
  useEffect(() => { (async () => { const b = await crLoad(); if (b) setCrOv(b); })(); }, []);
  const statusOf = (c) => { const o = crOv[c.id]; return o && o.status ? o.status : crSeedOne(c).status; };
  const rows = AML_FRAMEWORK.controls.map(c => ({ ...c, status: statusOf(c), map: FW_MAP(c.domain) }));

  // build buckets for the chosen framework
  const buckets = {};
  rows.forEach(c => {
    const keys = fw === "BSA" ? [c.map[0]] : fw === "FATF" ? c.map[1] : [c.map[2]];
    keys.forEach(k => { (buckets[k] = buckets[k] || []).push(c); });
  });
  const bucketRows = Object.entries(buckets).map(([k, cs]) => {
    const health = Math.round(cs.reduce((s, c) => s + crScore(c.status), 0) / cs.length);
    const gaps = cs.filter(c => c.status === "Gap" || c.status === "Not implemented").length;
    return { k, cs, health, gaps, title: fw === "FATF" ? (k + " · " + (FATF_RECS[k] || "")) : k };
  }).sort((a, b) => a.health - b.health);

  const totalMaps = rows.reduce((s, c) => s + (fw === "FATF" ? c.map[1].length : 1), 0);
  const overall = Math.round(rows.reduce((s, c) => s + crScore(c.status), 0) / rows.length);
  const FWS = [["BSA", "BSA / FFIEC pillars"], ["FATF", "FATF 40 Recommendations"], ["Wolfsberg", "Wolfsberg"]];
  const dn = (id) => AML_FRAMEWORK.domains.find(x => x.id === id)?.name || id;

  // assess-once-satisfy-many examples (controls touching most frameworks distinctly)
  const multi = rows.map(c => ({ c, n: 1 + c.map[1].length })).sort((a, b) => b.n - a.n).slice(0, 3);

  function exportXlsx() { try { const wb = XLSX.utils.book_new(); const a = [["Control", "Domain", "Status", "BSA / FFIEC", "FATF 40", "Wolfsberg"]]; rows.forEach(c => a.push([c.id, dn(c.domain), c.status, c.map[0], c.map[1].join(", "), c.map[2]])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), "Crosswalk"); XLSX.writeFile(wb, "Mal_Framework_Crosswalk.xlsx"); } catch (e) {} }

  return (<>
    <h1 className="h1">Framework Crosswalk</h1>
    <p className="sub">Mal's {AML_FRAMEWORK.controls.length} controls mapped once to the major external frameworks — BSA/FFIEC pillars, the FATF 40 Recommendations and Wolfsberg — so you can evidence coverage per framework from a single control set. Coverage health is pulled live from the Control Register: assess once, satisfy many.</p>

    <div className="row" style={{ gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
      {FWS.map(([id, label]) => <button key={id} className={"btn" + (fw === id ? " gold" : " ghost")} onClick={() => setFw(id)}><BookOpen size={13} /> {label}</button>)}
      <span className="spacer" />
      <button className="btn" onClick={exportXlsx}><Download size={13} /> Export</button>
    </div>

    <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 13 }}>
      <Kpi label="Framework requirements" value={bucketRows.length} sub={fw === "FATF" ? "Recommendations mapped" : "buckets"} />
      <Kpi label="Control → framework links" value={totalMaps} accent="var(--brand600)" />
      <Kpi label="Overall coverage" value={overall} accent={amlBand(overall).c} sub={amlBand(overall).t} />
      <Kpi label="Requirements with a gap" value={bucketRows.filter(b => b.gaps > 0).length} accent={bucketRows.some(b => b.gaps) ? "var(--amber)" : "var(--green)"} />
    </div>

    <div className="card" style={{ marginBottom: 13 }}><h3>Coverage by {fw === "BSA" ? "BSA / FFIEC pillar" : fw === "FATF" ? "FATF Recommendation" : "Wolfsberg section"} (weakest first)</h3>
      <div className="tablewrap"><table>
        <thead><tr><th>Requirement</th><th>Mal controls</th><th>Coverage health</th><th>Gaps</th><th>Mapped controls</th></tr></thead>
        <tbody>{bucketRows.map(b => { const bd = amlBand(b.health); return (
          <tr key={b.k}>
            <td style={{ minWidth: 200 }}><b style={{ fontWeight: 600 }}>{b.title}</b></td>
            <td><b>{b.cs.length}</b></td>
            <td style={{ minWidth: 130 }}><div className="row" style={{ gap: 7 }}><div className="bar" style={{ flex: 1, height: 8 }}><span style={{ width: b.health + "%", background: bd.c }} /></div><span style={{ color: bd.c, fontWeight: 700, fontSize: 12 }}>{b.health}</span></div></td>
            <td>{b.gaps ? <span className="chip" style={{ background: "#ef444422", color: "#ef4444" }}>{b.gaps}</span> : <span className="chip" style={{ background: "#17a34a22", color: "#17a34a" }}>0</span>}</td>
            <td><div className="row" style={{ gap: 4, flexWrap: "wrap" }}>{b.cs.map(c => <span key={c.id} className="chip mono" style={{ background: (CR_STATC[c.status] || "#64748b") + "18", color: CR_STATC[c.status] || "#64748b" }} title={c.requirement + " · " + c.status}>{c.id}</span>)}</div></td>
          </tr>
        ); })}</tbody>
      </table></div>
    </div>

    <div className="card"><h3>Assess once, satisfy many</h3>
      <div className="muted" style={{ fontSize: 12, marginBottom: 9 }}>A single Mal control typically evidences a BSA pillar, one or more FATF Recommendations and a Wolfsberg section at the same time.</div>
      {multi.map(({ c }) => (
        <div key={c.id} className="row" style={{ gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
          <span className="chip mono" style={{ background: "#f5f6fb" }}>{c.id}</span>
          <span style={{ fontSize: 12.5, flex: 1, minWidth: 160 }}>{c.requirement}</span>
          <span className="chip" style={{ background: "#eef2ff", color: "#3730a3" }}>BSA: {c.map[0]}</span>
          {c.map[1].map(r => <span key={r} className="chip" style={{ background: "#7c3aed18", color: "#7c3aed" }}>FATF {r}</span>)}
          <span className="chip" style={{ background: "#0891b218", color: "#0891b2" }}>Wolfsberg: {c.map[2]}</span>
        </div>
      ))}
    </div>
  </>);
}

/* ============================================================================
   EXAMINER ROOM & BOARD PACK — read-only data room for auditors/regulators
   and a one-click quarterly Board report, assembled from live platform data.
============================================================================ */
function ExaminerRoom() {
  const [sub, setSub] = useState("room");
  const [crOv, setCrOv] = useState({});
  const [cm, setCm] = useState(null);
  const [rt, setRt] = useState({});
  const [period, setPeriod] = useState("Q2 2026");
  useEffect(() => { (async () => { const b = await crLoad(); if (b) setCrOv(b); const c = await cmLoad(); setCm(c && c.cases ? c : cmSeed()); const r = await rtLoad(); if (r) setRt(r); })(); }, []);

  const W = AML_FRAMEWORK.riskWeights, DAY = 864e5, now = Date.now();
  const ctl = AML_FRAMEWORK.controls.map(c => { const s = crSeedOne(c); const o = crOv[c.id] || {}; return { ...c, status: o.status || s.status, lastTested: o.lastTested !== undefined ? o.lastTested : s.lastTested, cadence: s.cadence, evidence: o.evidence || s.evidence }; });
  const wavg = (arr) => { const tw = arr.reduce((s, x) => s + (W[x.risk] || 1), 0) || 1; return Math.round(arr.reduce((s, x) => s + crScore(x.status) * (W[x.risk] || 1), 0) / tw); };
  const health = wavg(ctl);
  const op = ctl.filter(c => c.status === "Operating").length, gaps = ctl.filter(c => c.status === "Gap" || c.status === "Not implemented").length;
  const overdue = ctl.filter(c => c.lastTested && (new Date(c.lastTested).getTime() + c.cadence * 30 * DAY) < now).length;
  const evItems = ctl.reduce((s, c) => s + c.evidence.length, 0), evidenced = ctl.filter(c => c.evidence.length).length;
  const cases = cm ? cm.cases : [], sars = cm ? cm.sars : [];
  const openCases = cases.filter(c => ["Open", "Investigating", "Pending QA", "Escalated"].includes(c.status)).length;
  const p1 = cases.filter(c => c.sev === "P1" && ["Open", "Investigating", "Pending QA"].includes(c.status)).length;
  const qa = cases.filter(c => c.status === "Pending QA").length;
  const regTask = (rc) => { const due = (now - rc.ago * DAY) + RC_SLA[rc.sev] * DAY; const dl = Math.round((due - now) / DAY); const od = dl < 0; const seed = crHash(rc.id) % 100; const st = rt[rc.id] || (od ? (seed < 50 ? "Open" : "In progress") : seed < 33 ? "Done" : seed < 66 ? "In progress" : "Open"); return { st, overdue: st !== "Done" && od }; };
  const regRows = REG_CHANGES.map(regTask); const regOpen = regRows.filter(r => r.st !== "Done").length, regOver = regRows.filter(r => r.overdue).length;
  const dist = THREAT_ATLAS.meta.distribution;
  const topCorr = [...THREAT_ATLAS.corridors].sort((a, b) => b.score - a.score).slice(0, 4);
  const trn = wavg(ctl.filter(c => c.domain === "TRN")), aud = wavg(ctl.filter(c => c.domain === "AUD")), sanc = wavg(ctl.filter(c => c.domain === "SANC"));
  const topGaps = ctl.filter(c => c.status === "Gap" || c.status === "Not implemented").sort((a, b) => (W[b.risk] - W[a.risk])).slice(0, 6);

  function examinerExtract() { try { const wb = XLSX.utils.book_new();
    const reg = [["Control", "Risk", "Owner", "Status", "Last tested", "Evidence", "Basis"]]; ctl.forEach(c => reg.push([c.id, c.risk, CR_OWNER(c.domain), c.status, c.lastTested || "—", c.evidence.length, c.citation])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reg), "Control register");
    const ev = [["Control", "Evidence", "Type", "Date"]]; ctl.forEach(c => c.evidence.forEach(e => ev.push([c.id, e.name, e.type, e.at]))); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ev), "Evidence index");
    const sr = [["SAR", "Case", "Subject", "Typology", "Filed"]]; sars.forEach(s => sr.push([s.id, s.case, s.cust, s.typName, new Date(s.filed).toLocaleDateString("en-GB")])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sr), "SAR register");
    const rc = [["Change", "Source", "Title", "Impact", "Task"]]; REG_CHANGES.forEach((c, i) => rc.push([c.id, c.src, c.title, c.sev, regRows[i].st])); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rc), "Reg-change register");
    XLSX.writeFile(wb, "Mal_Examiner_Extract_" + period.replace(" ", "_") + ".xlsx"); } catch (e) {} }

  function boardPack() { try { const wb = XLSX.utils.book_new();
    const s = [["Mal Money Inc. — Board Compliance Pack", period], ["Prepared by", "US BSA CO (Jason Mullen) / MLRO (Tayel Mohamed)"], [],
      ["EXECUTIVE SUMMARY"], ["Control health", health + " / 100 (" + amlBand(health).t + ")"], ["Operating controls", op + " / " + ctl.length], ["Open gaps", gaps], ["Overdue control tests", overdue],
      ["SARs filed", sars.length], ["Open cases", openCases], ["P1 open", p1], ["Awaiting four-eyes", qa],
      ["Reg-change tasks open / overdue", regOpen + " / " + regOver], [],
      ["SANCTIONS & SCREENING"], ["Sanctions control health", sanc], [],
      ["TRAINING & INDEPENDENT TESTING"], ["Training health", trn], ["Independent testing health", aud], [],
      ["KEY RISKS & REMEDIATION (top gaps)"]];
    topGaps.forEach(g => s.push([g.id + " · " + g.requirement, g.status + " · " + g.risk]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s), "Board pack");
    XLSX.writeFile(wb, "Mal_Board_Pack_" + period.replace(" ", "_") + ".xlsx"); } catch (e) {} }

  const Row = ({ k, v, c }) => <div className="row" style={{ justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--line)" }}><span className="muted" style={{ fontSize: 12.5 }}>{k}</span><b style={{ fontSize: 12.5, color: c || "var(--text)" }}>{v}</b></div>;
  const SUBS = [["room", "Examiner room", Lock], ["board", "Board pack", FileSignature]];

  return (<>
    <h1 className="h1">Examiner Room & Board Pack</h1>
    <p className="sub">A read-only evidence room to hand an auditor or regulator, and a one-click quarterly Board pack — both assembled live from the platform: control register, evidence index, SAR register, reg-change posture and the risk picture. This operationalises the programme's own "examiner-grade extract within 10 business days" standard.</p>

    <div className="row" style={{ gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
      {SUBS.map(([id, label, Ic]) => <button key={id} className={"btn" + (sub === id ? " gold" : " ghost")} onClick={() => setSub(id)}><Ic size={13} /> {label}</button>)}
      <span className="spacer" />
      <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: "auto", minWidth: 120 }}>{["Q2 2026", "Q1 2026", "Q4 2025"].map(p => <option key={p}>{p}</option>)}</select>
    </div>

    {sub === "room" && (<>
      <div className="card" style={{ marginBottom: 13, borderColor: "var(--brand)" }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div className="row" style={{ gap: 8 }}><Lock size={15} color="var(--brand600)" /><b style={{ fontSize: 13 }}>Read-only examiner access · scope {period}</b></div>
          <div className="row" style={{ gap: 8 }}><span className="chip" style={{ background: "#fef3c7", color: "#b45309" }}><Clock size={11} /> Expires in 10 business days</span><button className="btn gold" onClick={examinerExtract}><Download size={13} /> Generate examiner extract</button></div>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div className="card"><h3><Building2 size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Programme overview</h3>
          <Row k="Entity" v="Mal Money Inc. (FinCEN MSB)" /><Row k="MLRO" v="Tayel Mohamed" /><Row k="US BSA Compliance Officer" v="Jason Mullen" /><Row k="Board / Sole Director" v="Abdallah Abu Sheikh" /><Row k="Live corridor" v="US → Pakistan (SwiftX)" />
        </div>
        <div className="card"><h3><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Control register extract</h3>
          <Row k="Control health" v={health + " / 100"} c={amlBand(health).c} /><Row k="Operating" v={op + " / " + ctl.length} /><Row k="Open gaps" v={gaps} c={gaps ? "var(--red)" : "var(--green)"} /><Row k="Overdue tests" v={overdue} c={overdue ? "var(--amber)" : "var(--green)"} /><Row k="Evidence items / controls evidenced" v={evItems + " / " + evidenced} />
        </div>
        <div className="card"><h3><FolderOpen size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Cases & SAR register</h3>
          <Row k="Open cases" v={openCases} /><Row k="P1 open" v={p1} c={p1 ? "var(--red)" : "var(--green)"} /><Row k="Awaiting four-eyes" v={qa} /><Row k="SARs filed" v={sars.length} />
          <div className="muted" style={{ fontSize: 11, marginTop: 7 }}>SAR detail is access-restricted; only register-level metadata is exposed in the room.</div>
        </div>
        <div className="card"><h3><Flame size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Risk picture</h3>
          <Row k="Critical inherent risks" v={dist.Critical} c="var(--red)" /><Row k="Highest-risk corridor" v={topCorr[0] ? topCorr[0].corridor + " (" + topCorr[0].score + ")" : "—"} /><Row k="Reg-change tasks open / overdue" v={regOpen + " / " + regOver} c={regOver ? "var(--red)" : undefined} /><Row k="Sanctions control health" v={sanc} c={amlBand(sanc).c} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 13 }}><div className="row" style={{ gap: 8, alignItems: "flex-start" }}><CircleAlert size={14} className="muted" style={{ marginTop: 1 }} /><span className="muted" style={{ fontSize: 11.5 }}>Demonstrator packaging. In production the examiner room is a time-boxed, access-controlled data room: read-only credentials that expire, watermarked exports, and every view/download written to a tamper-evident access log.</span></div></div>
    </>)}

    {sub === "board" && (
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div><h2 style={{ margin: 0, fontSize: 18 }}>Board Compliance Pack — {period}</h2><div className="muted" style={{ fontSize: 12 }}>Mal Money Inc. · prepared by the CO & MLRO · mapped to the Doc 2.1 MI specification</div></div>
          <button className="btn gold" onClick={boardPack}><Download size={13} /> Generate board pack (Excel)</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 14 }}>
          <Kpi label="Control health" value={health} accent={amlBand(health).c} sub={amlBand(health).t} />
          <Kpi label="SARs filed" value={sars.length} />
          <Kpi label="Open cases" value={openCases} sub={p1 + " P1"} accent={p1 ? "var(--red)" : undefined} />
          <Kpi label="Open gaps" value={gaps} accent={gaps ? "var(--red)" : "var(--green)"} />
          <Kpi label="Reg tasks overdue" value={regOver} accent={regOver ? "var(--red)" : "var(--green)"} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 13 }}>
          <div className="card"><h3>1 · Executive summary</h3>
            <p style={{ fontSize: 12.5, margin: 0 }}>The BSA/AML programme health stands at <b style={{ color: amlBand(health).c }}>{health}/100 ({amlBand(health).t})</b>. {op} of {ctl.length} controls are operating; <b>{gaps}</b> gaps and <b>{overdue}</b> overdue tests are tracked to remediation. {sars.length} SAR(s) filed this period; {openCases} cases open ({p1} P1, {qa} awaiting four-eyes). {regOpen} regulatory-change tasks open ({regOver} overdue).</p>
          </div>
          <div className="card"><h3>2 · Control health & testing</h3>
            <Row k="Weighted control health" v={health + " / 100"} c={amlBand(health).c} /><Row k="Operating / total" v={op + " / " + ctl.length} /><Row k="Open gaps" v={gaps} c={gaps ? "var(--red)" : "var(--green)"} /><Row k="Overdue tests" v={overdue} c={overdue ? "var(--amber)" : "var(--green)"} /><Row k="Evidence coverage" v={evidenced + " / " + ctl.length + " controls"} />
          </div>
          <div className="card"><h3>3 · SAR & case MI</h3>
            <Row k="SARs filed (period)" v={sars.length} /><Row k="Open cases" v={openCases} /><Row k="P1 open" v={p1} c={p1 ? "var(--red)" : "var(--green)"} /><Row k="Awaiting four-eyes (QA)" v={qa} /><div className="muted" style={{ fontSize: 11, marginTop: 6 }}>SAR confidentiality maintained; subject never notified.</div>
          </div>
          <div className="card"><h3>4 · Sanctions, training & audit</h3>
            <Row k="Sanctions control health" v={sanc + " / 100"} c={amlBand(sanc).c} /><Row k="Training health" v={trn + " / 100"} c={amlBand(trn).c} /><Row k="Independent testing health" v={aud + " / 100"} c={amlBand(aud).c} /><Row k="ARBP (blocked property)" v="Due 30 Sep" />
          </div>
          <div className="card"><h3>5 · Regulatory change & horizon</h3>
            <Row k="Changes tracked" v={REG_CHANGES.length} /><Row k="High-impact" v={REG_CHANGES.filter(c => c.sev === "high").length} c="var(--red)" /><Row k="Tasks open / overdue" v={regOpen + " / " + regOver} c={regOver ? "var(--red)" : undefined} />
          </div>
          <div className="card"><h3>6 · Risk assessment & typologies</h3>
            <Row k="Critical inherent risks" v={dist.Critical} c="var(--red)" /><Row k="High" v={dist.High} c="var(--amber)" />{topCorr.slice(0, 3).map(c => <Row key={c.corridor} k={c.corridor} v={"L×I " + c.score + " · " + c.rating} c={atRC(c.rating)} />)}
          </div>
        </div>
        <div className="card" style={{ marginTop: 13 }}><h3>7 · Key risks & remediation</h3>
          {topGaps.length === 0 ? <div className="muted" style={{ fontSize: 12.5 }}>No open gaps.</div> : topGaps.map(g => (
            <div key={g.id} className="row" style={{ gap: 8, padding: "6px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              <span className="chip mono" style={{ background: "#f5f6fb" }}>{g.id}</span><span style={{ fontSize: 12.5, flex: 1, minWidth: 160 }}>{g.requirement}</span>
              <span className="chip" style={{ background: (CR_STATC[g.status] || "#64748b") + "22", color: CR_STATC[g.status] || "#64748b" }}>{g.status}</span><span className="chip" style={{ background: "#f5f6fb" }}>{g.risk}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </>);
}

export default function App() {

  const [role, setRole] = useState("supervisor"); // supervisor | agent
  const [actingPartner, setActingPartner] = useState("swiftx");
  const [tab, setTab] = useState("oversight");
  const [profileId, setProfileId] = useState(null); // supervisor viewing an agent profile
  const [now, setNow] = useState(Date.now());
  const [store, setStore] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [live, setLive] = useState({ items: [], at: null, status: "idle" }); // idle|loading|ok|error
  const [obCategory, setObCategory] = useState(null);
  const [screeningLoading, setScreeningLoading] = useState({});
  const [intake, setIntake] = useState(null);

  useEffect(() => { (async () => { const s = await loadStore(); setStore(s && s.v === SEED_VERSION ? s : seed()); const c = await loadLive(); if (c && c.items?.length) setLive({ ...c, status: "ok" }); })(); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { try { const m = (window.location.hash || "").match(/intake=([^&]+)/); if (m) { const c = decodeURIComponent(m[1]); setIntake({ category: CATEGORIES.find(x => x.id === c) ? c : null }); } } catch (e) {} }, []);
  useEffect(() => { setTab(role === "supervisor" ? "oversight" : "profile"); setProfileId(null); }, [role]);

  async function fetchScreening(partnerId) {
    const p = [...AGENTS_BASE, ...((store && store.partners) || [])].find(a => a.id === partnerId); if (!p) return;
    setScreeningLoading(s => ({ ...s, [partnerId]: true }));
    const prompt = `Conduct an open-source due-diligence screen on this company and return findings as STRICT JSON only.\nCompany: "${p.name}". Jurisdiction(s): ${p.juris.join(", ")}. Sector: ${p.category}. Named owners / directors / officers to screen individually for adverse media, sanctions and PEP status: ${(p.kdp || []).map(k => k.name + " (" + k.role + ")").join("; ") || "none provided — identify and verify UBOs/directors from public registers"}.\nSearch for: (1) sanctions or watchlist presence (OFAC/UN/EU/UK/local); (2) adverse media (fraud, money laundering, enforcement, fines, scandal, lawsuits); (3) beneficial owners / shareholders; (4) managing directors / senior officers; (5) negative customer or market feedback, reviews or complaints.\nReturn ONLY this JSON (no prose, no code fences): {"summary": string up to 200 chars, "riskFlag": "Low"|"Medium"|"High", "sanctions": [{"list": string, "detail": string, "url": string}], "adverseMedia": [{"headline": string, "source": string, "date": "YYYY-MM-DD" or "", "sev": "crit"|"high"|"med"|"low", "url": string}], "ubos": [{"name": string, "detail": string}], "directors": [{"name": string, "role": string}], "feedback": [{"summary": string, "sentiment": "negative"|"neutral"|"positive", "source": string, "url": string}]}. Empty array where nothing is found. Do not fabricate; report only what sources support.`;
    let result;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }], tools: [{ type: "web_search_20250305", name: "web_search" }] }) });
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      const a = text.indexOf("{"), b = text.lastIndexOf("}");
      const parsed = (a !== -1 && b !== -1) ? JSON.parse(text.slice(a, b + 1)) : {};
      result = { at: new Date().toISOString(), summary: parsed.summary || "Screening complete.", riskFlag: parsed.riskFlag || "Low",
        sanctions: parsed.sanctions || [], adverseMedia: parsed.adverseMedia || [], ubos: parsed.ubos || [], directors: parsed.directors || [], feedback: parsed.feedback || [] };
    } catch (e) { result = { at: new Date().toISOString(), error: true, summary: "Screening source unavailable." }; }
    const hits = (result.sanctions && result.sanctions.length > 0) || ((result.adverseMedia || []).some(m => m.sev === "crit" || m.sev === "high"));
    setStore(prev => {
      const ag = { ...prev.agents[partnerId], screening: result, lifecycle: result.error ? (prev.agents[partnerId].lifecycle || "Stage 3 — Verification & DD") : (hits ? "Stage 4 — Risk assessment · escalated" : "Stage 4 — Risk assessment") };
      let reviews = prev.reviews;
      if (hits && !result.error) {
        const fnd = [];
        (result.sanctions || []).forEach((x, i) => fnd.push({ ref: "S-" + (i + 1), desc: "Sanctions / watchlist: " + (x.list ? x.list + " — " : "") + (x.detail || ""), sev: "Critical", standard: "OFAC/UN/EU/UK sanctions screening", status: "Open" }));
        (result.adverseMedia || []).filter(m => m.sev === "crit" || m.sev === "high").forEach((m, i) => fnd.push({ ref: "A-" + (i + 1), desc: "Adverse media: " + m.headline, sev: m.sev === "crit" ? "Critical" : "High", standard: "Adverse media / reputation", status: "Open" }));
        const existing = Object.values(prev.reviews).find(r => r.agent === partnerId && r.status !== "Closed");
        if (existing) {
          reviews = { ...prev.reviews, [existing.id]: { ...existing, findings: [...existing.findings, ...fnd], level: (existing.level && existing.level !== "No findings" && existing.level !== "Observations only") ? existing.level : "Significant findings", status: existing.status === "Assigned" ? "Working" : existing.status } };
        } else {
          const cid = "CASE-SCR-" + partnerId.slice(0, 4).toUpperCase() + "-" + String(Date.now()).slice(-4);
          reviews = { ...prev.reviews, [cid]: { id: cid, agent: partnerId, reason: "Risk-based (screening alert)", status: "Working", level: "Significant findings", start: new Date().toISOString(), foDue: new Date(Date.now() + 10 * 864e5).toISOString(), assignedTo: "Screening engine → MLRO", country: p.jur, txStart: "", txEnd: "", txGroup: "", findings: fnd, remediation: [], cleared: false } };
        }
        ag.feed = [{ id: "f" + Date.now(), kind: "Risk assessment", at: new Date().toISOString(), text: "Screening alert — " + fnd.length + " finding(s) raised and escalated to a review.", actor: "Screening engine" }, ...(ag.feed || [])];
      }
      const next = { ...prev, reviews, agents: { ...prev.agents, [partnerId]: ag } };
      saveStore(next); return next;
    });
    setScreeningLoading(s => ({ ...s, [partnerId]: false }));
    audit(hits ? "Screening alert — finding raised" : "Ran partner screening", p.name);
  }
  const coveredJurs = Array.from(new Set([...AGENTS_BASE, ...((store && store.partners) || [])].filter(a => a.category === "Payout partners").map(a => a.jur)));

  const fetchLive = useCallback(async (jurs) => {
    setLive(l => ({ ...l, status: "loading" }));
    const list = jurs.join(", ");
    const prompt = `Search the web for the most recent (last 30 days) developments in three areas relevant to cross-border payout / remittance compliance for these jurisdictions: ${list}. The three areas are: financial-crime FRAUD typologies and scam alerts; SANCTIONS designations or sanctions-program updates; and new or proposed AML/CFT REGULATIONS, regulatory circulars, or enforcement actions. Also include notable UNITED STATES regulatory updates (FinCEN, OFAC, BSA). Prioritise official regulators and reputable outlets.\n\nReturn ONLY a JSON array (no prose, no markdown fences) of up to 14 objects, each: {"jur": one of [${list}, "United States", "Global"], "type": "FRAUD"|"SANCTIONS"|"REG", "sev": "crit"|"high"|"med"|"low", "headline": string up to 140 chars, "source": publication or regulator name, "date": "YYYY-MM-DD" or "", "url": source url or ""}. Order most recent first.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }], tools: [{ type: "web_search_20250305", name: "web_search" }] }),
      });
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      let arr = [];
      const a = text.indexOf("["), b = text.lastIndexOf("]");
      if (a !== -1 && b !== -1) arr = JSON.parse(text.slice(a, b + 1));
      arr = (Array.isArray(arr) ? arr : []).filter(x => x && x.headline && x.type).map((x, i) => ({
        id: "live" + Date.now() + i, jur: x.jur || "Global", type: ["FRAUD", "SANCTIONS", "REG"].includes(x.type) ? x.type : "REG",
        sev: ["crit", "high", "med", "low"].includes(x.sev) ? x.sev : "med", text: String(x.headline).slice(0, 180),
        source: x.source || "web", at: x.date || "", url: x.url || "",
      }));
      const next = { items: arr, at: new Date().toISOString(), status: "ok" };
      setLive(next); saveLive(next);
      flash(arr.length ? `Live news updated · ${arr.length} items` : "No live items returned");
    } catch (e) {
      setLive(l => ({ ...l, status: "error" }));
      flash("Could not reach the live news source");
    }
  }, []);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const persist = useCallback((next) => { setStore(next); saveStore(next); }, []);
  function audit(action, target) {
    setStore(prev => { const e = { id: "a" + Date.now(), at: new Date().toISOString(), actor: role === "supervisor" ? "Supervisor (Mal)" : partnerName(actingPartner), role, action, target }; const next = { ...prev, audit: [e, ...prev.audit] }; saveStore(next); return next; });
  }
  const baseAll = () => [...AGENTS_BASE, ...((store && store.partners) || [])];
  const partnerName = (id) => baseAll().find(a => a.id === id)?.name || id;

  if (!store) return <div className="mpc" style={{ display: "grid", placeItems: "center", height: "100vh" }}><div className="muted">Loading platform…</div></div>;

  if (intake) {
    return (
      <div className="mpc"><style>{CSS}</style>
        <div className="topbar"><div className="brand"><span className="brandmark"><MalEmblem size={20} /></span> <b>Mal</b> · Partner onboarding</div></div>
        <div className="main" style={{ maxWidth: 920, margin: "0 auto" }}>
          {intake.done ? (
            <div className="card" style={{ textAlign: "center", padding: 40 }}>
              <ShieldCheck size={34} color="var(--gold)" />
              <h1 className="h1" style={{ marginTop: 12 }}>Thank you</h1>
              <p className="sub" style={{ margin: "8px auto 0" }}>Your details are with Mal’s compliance team. We’ll verify everything independently and be in touch. You can close this page.</p>
            </div>
          ) : !intake.category ? (
            <>
              <h1 className="h1">Welcome — let’s onboard your business</h1>
              <p className="sub">Choose what best describes your relationship with Mal. It only takes a few minutes — we ask for the minimum and verify the rest ourselves.</p>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
                {CATEGORIES.map(cat => <div className="card" key={cat.id}><div className="row" style={{ gap: 9 }}><span className="catdot" style={{ background: cat.color }} /><b>{cat.id}</b></div><div className="muted" style={{ fontSize: 12, margin: "6px 0 12px" }}>{cat.note}</div><button className="btn gold" onClick={() => setIntake({ category: cat.id })}>Start</button></div>)}
              </div>
            </>
          ) : (
            <OnboardingWizard invite category={intake.category} onCancel={() => setIntake({ category: null })} onComplete={(c, v) => { onboardPartner(c, v); setIntake({ category: intake.category, done: true }); }} />
          )}
        </div>
      </div>
    );
  }

  const agents = baseAll().map(a => ({ base: a, slice: store.agents[a.id] })).filter(x => x.slice);

  /* ---- actions ---- */
  function submitReport(agentId, typeId, values) {
    const t = REPORT_TYPES.find(r => r.id === typeId);
    const ref = `${t.name.split(" ")[0].toUpperCase()}-${agentId}-${String(Date.now()).slice(-4)}`;
    const rec = { ref, at: new Date().toISOString(), status: "Filed", summary: values.summary || t.name };
    setStore(prev => {
      const ag = { ...prev.agents[agentId] };
      const regKey = ["sar", "str", "fatca", "crs", "questionnaire", "cert", "audit"].includes(typeId) ? typeId : "correspondence";
      ag.registers = { ...ag.registers, [regKey]: [rec, ...ag.registers[regKey]] };
      ag.feed = [{ id: "f" + Date.now(), kind: t.name.includes("SAR") ? "SAR" : t.name.includes("STR") ? "STR" : "Filing", at: rec.at, text: `${t.name} submitted — ${rec.summary}`, actor: partnerName(agentId) }, ...ag.feed];
      const next = { ...prev, agents: { ...prev.agents, [agentId]: ag } };
      saveStore(next); return next;
    });
    audit("Submitted " + t.name, agentId);
    flash(`${t.name} submitted and synced to the master dashboard`);
    setModal(null);
  }
  function completeCourse(agentId, courseId) {
    setStore(prev => {
      const ag = { ...prev.agents[agentId] };
      ag.training = ag.training.map(c => c.id === courseId ? { ...c, status: "Completed", score: 85 } : c);
      ag.feed = [{ id: "f" + Date.now(), kind: "Training", at: new Date().toISOString(), text: `Completed “${COURSES.find(c => c.id === courseId).title}”.`, actor: partnerName(agentId) }, ...ag.feed];
      const next = { ...prev, agents: { ...prev.agents, [agentId]: ag } }; saveStore(next); return next;
    });
    audit("Completed training", agentId); flash("Training completed");
  }
  function ackBroadcast(agentId, bId, applied) {
    setStore(prev => {
      const ag = { ...prev.agents[agentId] };
      if (!ag.acks.find(x => x.id === bId)) ag.acks = [...ag.acks, { id: bId, at: new Date().toISOString(), applied }];
      ag.feed = [{ id: "f" + Date.now(), kind: "Policy update", at: new Date().toISOString(), text: `Acknowledged “${prev.broadcasts.find(b => b.id === bId).title}” — ${applied ? "confirmed applied" : "noted"}.`, actor: partnerName(agentId) }, ...ag.feed];
      const next = { ...prev, agents: { ...prev.agents, [agentId]: ag } }; saveStore(next); return next;
    });
    audit("Acknowledged broadcast", bId); flash(applied ? "Acknowledged and confirmed applied" : "Acknowledged");
  }
  function shareIntel(agentId, values) {
    setStore(prev => {
      const item = { id: "lib" + Date.now(), jur: baseAll().find(a => a.id === agentId).jur, type: values.type, sev: values.sev, text: values.text, at: new Date().toISOString(), source: partnerName(agentId) };
      const ag = { ...prev.agents[agentId] };
      ag.feed = [{ id: "f" + Date.now(), kind: "Correspondence", at: item.at, text: `Shared a ${values.type} update for ${item.jur}.`, actor: partnerName(agentId) }, ...ag.feed];
      const next = { ...prev, library: [item, ...prev.library], agents: { ...prev.agents, [agentId]: ag } }; saveStore(next); return next;
    });
    audit("Shared regulatory intelligence", agentId); flash("Intelligence shared to the library"); setModal(null);
  }
  function broadcast(values) {
    setStore(prev => { const b = { id: "b" + Date.now(), at: new Date().toISOString(), title: values.title, body: values.body, behavior: values.behavior, sev: values.sev || "med", jur: values.jur || "All" }; const next = { ...prev, broadcasts: [b, ...prev.broadcasts] }; saveStore(next); return next; });
    audit("Broadcast regulatory update", values.title); flash("Broadcast sent to partners"); setModal(null);
  }
  function raiseSpeakup(values) {
    setStore(prev => { const s = { id: "s" + Date.now(), at: new Date().toISOString(), from: role === "partner" ? partnerName(actingPartner) : "Supervisor", topic: values.topic, body: values.body, anon: values.anon === "Y" }; const next = { ...prev, speakup: [s, ...prev.speakup] }; saveStore(next); return next; });
    audit("Raised speak-up report", "(confidential)"); flash("Submitted to the speak-up channel"); setModal(null);
  }
  function updateReview(caseId, patch) {
    setStore(prev => { const r = { ...prev.reviews[caseId], ...patch }; const next = { ...prev, reviews: { ...prev.reviews, [caseId]: r } }; saveStore(next); return next; });
    audit("Updated program review", caseId);
  }

  /* ---- nav ---- */
  function onboardPartner(category, v) {
    const id = (v.entityName || "partner").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) + Date.now().toString().slice(-4);
    const yes = (x) => String(x).toUpperCase() === "Y";
    const jurs = (v.jurisdictions || "").split(",").map(x => x.trim()).filter(Boolean);
    const jur = jurs[0] || v.country || "Global";
    const riskTier = suggestTier(category, jur);
    const s2 = {
      reporting: 65, responsiveness: 70, training: 55, audit: 60, findings: 72, timeliness: 70,
      quality: yes(v.amlAttest) ? 72 : 60, cooperation: yes(v.consent) ? 80 : 65,
      risk: riskTier.startsWith("Tier 3") ? 52 : riskTier.startsWith("Tier 2") ? 66 : 80,
    };
    const partner = {
      id, name: v.entityName, category, relationship: v.products || (CATEGORIES.find(c => c.id === category)?.note || ""),
      jur, juris: jurs.length ? jurs : [v.country || "Global"],
      license: [v.regulator, v.licenceNumber].filter(Boolean).join(" ") || "Pending verification",
      tier: riskTier.startsWith("Tier 3") ? "Critical" : riskTier.startsWith("Tier 2") ? "High" : "Medium",
      riskTier, lifecycle: "Stage 3 — Verification & DD", live: false,
      contacts: [{ role: "Compliance contact", name: v.coName || "—", email: v.coEmail || "" }],
      scores: s2, history: [Math.round(Object.keys(SCORE_W).reduce((a, k) => a + s2[k] * SCORE_W[k], 0))], onboardedAt: new Date().toISOString(),
    };
    const ddmap = {}; DD_ITEMS.forEach(d => ddmap[d.id] = "Outstanding"); ddmap.onboarding = "Complete";
    const slice = {
      feed: [{ id: "f" + Date.now(), kind: "Risk assessment", at: new Date().toISOString(), text: "Light intake received — Mal deep due diligence & screening started.", actor: "Supervisor (Mal)" }],
      registers: { sar: [], str: [], fatca: [], crs: [], questionnaire: [], cert: [], audit: [], correspondence: [], corrective: [] },
      training: COURSES.map(c => ({ ...c, status: "Not started", score: null })),
      dd: ddmap, acks: [], onboarding: { ...v, category, onboardedAt: partner.onboardedAt }, screening: null,
    };
    setStore(prev => { const next = { ...prev, partners: [...(prev.partners || []), partner], agents: { ...prev.agents, [id]: slice } }; saveStore(next); return next; });
    audit("Onboarded partner (light intake)", v.entityName + " (" + category + ")");
    flash(v.entityName + " onboarded — profile created; screening started");
    setTimeout(() => fetchScreening(id), 300);
  }

  const SUP_NAV = [
    { id: "oversight", label: "Oversight dashboard", icon: LayoutDashboard },
    { id: "ard1", label: "ARD-1 Supervisor Dashboard", icon: ShieldCheck },
    { id: "agents", label: "Partners", icon: Users },
    { id: "lifecycle", label: "Product lifecycle", icon: Film },
    { id: "onboarding", label: "Onboarding & forms", icon: UserPlus },
    { id: "examiner", label: "AML/CFT Policy Examiner", icon: ShieldAlert },
    { id: "atlas", label: "Threat Atlas", icon: Globe },
    { id: "controls", label: "Control Register & Evidence", icon: ShieldCheck },
    { id: "casemgmt", label: "Case Management", icon: FolderOpen },
    { id: "regchange", label: "Regulatory Change & Impact", icon: Megaphone },
    { id: "crosswalk", label: "Framework Crosswalk", icon: BookOpen },
    { id: "examinerroom", label: "Examiner Room & Board Pack", icon: FileSignature },
    { id: "reviews", label: "Program reviews & SLA", icon: ClipboardCheck, badge: Object.values(store.reviews).filter(r => r.status !== "Closed" && slaStatus(r.foDue).cd < 0).length || null },
    { id: "obligations", label: "Obligations & SLA", icon: Clock, badge: OBLIGATIONS.filter(o => o.due && dueIn(o.due) < 0).length || null },
    { id: "reporting", label: "Reporting hub", icon: FileText },
    { id: "intel", label: "Intelligence library", icon: Radio },
    { id: "training", label: "Knowledge & training", icon: GraduationCap },
    { id: "comms", label: "Communications", icon: Megaphone },
    { id: "exec", label: "Executive dashboard", icon: BarChart3 },
    { id: "audit", label: "Audit trail", icon: Database },
  ];
  const AG_NAV = [
    { id: "profile", label: "My profile", icon: Building2 },
    { id: "standing", label: "My standing", icon: Trophy },
    { id: "lifecycleA", label: "Product lifecycle", icon: Film },
    { id: "reportingA", label: "Reporting hub", icon: FileText },
    { id: "intelA", label: "Intelligence", icon: Radio },
    { id: "trainingA", label: "Training center", icon: GraduationCap },
    { id: "ddA", label: "Due diligence file", icon: FolderOpen },
    { id: "slaA", label: "Obligations & SLA", icon: Clock, badge: OBLIGATIONS.filter(o => o.partner === actingPartner && o.due && dueIn(o.due) < 0).length || null },
    { id: "reviewsA", label: "My reviews", icon: ClipboardCheck },
    { id: "commsA", label: "Communications", icon: Megaphone, badge: store.broadcasts.filter(b => !store.agents[actingPartner].acks.find(x => x.id === b.id)).length || null },
  ];
  const nav = role === "supervisor" ? SUP_NAV : AG_NAV;
  const tickerJur = role === "partner" ? baseAll().find(a => a.id === actingPartner).jur : null;
  const liveScoped = (role === "partner"
    ? live.items.filter(l => l.jur === tickerJur || ((l.type === "REG" || l.type === "SANCTIONS") && (l.jur === "United States" || l.jur === "Global")))
    : live.items.filter(l => coveredJurs.includes(l.jur) || l.jur === "United States" || l.jur === "Global"));
  const seedScoped = (role === "partner" ? store.library.filter(l => l.jur === tickerJur) : store.library);
  const tickerItems = [...liveScoped, ...seedScoped].slice(0, 16);

  return (
    <div className="mpc">
      <style>{CSS}</style>

      <div className="topbar">
        <div className="brand"><span className="brandmark"><MalEmblem size={20} /></span> <b>Mal</b> · Third-Party Risk & Oversight Platform</div>
        <div className="seg">
          <button className={role === "supervisor" ? "on" : ""} onClick={() => setRole("supervisor")}>Supervisor</button>
          <button className={role === "partner" ? "on" : ""} onClick={() => setRole("partner")}>Partner</button>
        </div>
        {role === "partner" && (
          <select className="pill mono" value={actingPartner} onChange={e => { setActingPartner(e.target.value); }}>
            {CATEGORIES.map(cat => { const inCat = baseAll().filter(a => a.category === cat.id); if (!inCat.length) return null; return (
              <optgroup key={cat.id} label={cat.id}>{inCat.map(a => <option key={a.id} value={a.id}>{a.name} · {a.jur}</option>)}</optgroup>
            ); })}
          </select>
        )}
        <span className="spacer" />
        {role === "partner" && (() => { const a = baseAll().find(x => x.id === actingPartner); return (
          <div className="statchip"><Building2 size={15} color="var(--gold)" /><span style={{ fontSize: 12.5, fontWeight: 700 }}>{a.name}</span></div>
        ); })()}
      </div>

      {/* signature intelligence crawl — live online feed */}
      <div className="ticker">
        <div className="live"><span className="pulse" /> {role === "partner" ? tickerJur + " desk" : "GLOBAL DESK"}</div>
        <div className="track"><div className="crawl">
          {[...tickerItems, ...tickerItems].map((it, i) => (
            <span className="item" key={i}><span className="dot" style={{ background: SEV[it.sev].c }} />
              <span className="tag" style={{ background: TYPE_COLOR[it.type] + "22", color: TYPE_COLOR[it.type] }}>{it.type}</span>
              <span className="muted mono" style={{ fontSize: 11 }}>{it.jur}</span> {it.text}</span>
          ))}
          {tickerItems.length === 0 && <span className="item muted">No items yet — refresh the live feed.</span>}
        </div></div>
        <button className="livebtn" title="Refresh live news" onClick={() => fetchLive(role === "partner" ? [tickerJur, "United States"] : [...coveredJurs, "United States"])} disabled={live.status === "loading"}>
          <Radio size={13} />{live.status === "loading" ? "Fetching…" : live.items.length ? "Refresh" : "Get live news"}
        </button>
      </div>

      <div className="shell">
        <nav className="rail">
          <div className="railhead">{role === "supervisor" ? "SUPERVISION" : "PARTNER WORKSPACE"}</div>
          {nav.map(n => (
            <div key={n.id} className={"navbtn" + (tab === n.id ? " active" : "")} onClick={() => { setTab(n.id); setProfileId(null); }} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && setTab(n.id)}>
              <n.icon size={16} /> {n.label}{n.badge ? <span className="badge">{n.badge}</span> : null}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div className="navbtn" onClick={() => setModal({ t: "speakup" })}><MessageSquare size={16} /> Speak-up channel</div>
        </nav>

        <main className="main">
          {/* SUPERVISOR */}
          {role === "supervisor" && profileId && <Profile {...{ store, agents, id: profileId, back: () => setProfileId(null), now, supervisor: true, updateReview, setModal, onScreen: fetchScreening, screenLoading: screeningLoading }} />}
          {role === "supervisor" && !profileId && tab === "oversight" && <Oversight {...{ agents, store, openProfile: setProfileId }} />}
          {role === "supervisor" && !profileId && tab === "ard1" && <ARD1Dashboard {...{ agents, store, openProfile: setProfileId }} />}
          {role === "supervisor" && !profileId && tab === "agents" && <Directory {...{ agents, store, openProfile: setProfileId }} />}
          {role === "supervisor" && !profileId && tab === "lifecycle" && <LifecycleShow />}
          {role === "supervisor" && !profileId && tab === "reviews" && <Reviews {...{ store, partnerName, updateReview, supervisor: true, setModal }} />}
          {role === "supervisor" && !profileId && tab === "reporting" && <ReportingHub {...{ store, agents, supervisor: true }} />}
          {role === "supervisor" && !profileId && tab === "intel" && <Intel {...{ store, supervisor: true, setModal, live, onRefresh: () => fetchLive([...coveredJurs, "United States"]), jurs: [...coveredJurs, "United States"] }} />}
          {role === "supervisor" && !profileId && tab === "training" && <TrainingCenter {...{ store, agents, supervisor: true }} />}
          {role === "supervisor" && !profileId && tab === "comms" && <Comms {...{ store, agents, supervisor: true, setModal }} />}
          {role === "supervisor" && !profileId && tab === "exec" && <Exec {...{ agents, store }} />}
          {role === "supervisor" && !profileId && tab === "audit" && <AuditTrail store={store} />}
          {role === "supervisor" && !profileId && tab === "obligations" && <ObligationsRollup {...{ store, agents, viewProfile: (id) => setProfileId(id) }} />}
          {role === "supervisor" && !profileId && tab === "onboarding" && <Onboarding {...{ store, category: obCategory, setCategory: setObCategory, onboard: onboardPartner, viewProfile: (id) => setProfileId(id) }} />}
          {role === "supervisor" && !profileId && tab === "examiner" && <AMLExaminer />}
          {role === "supervisor" && !profileId && tab === "atlas" && <ThreatAtlas />}
          {role === "supervisor" && !profileId && tab === "controls" && <ControlRegister />}
          {role === "supervisor" && !profileId && tab === "casemgmt" && <CaseManagement />}
          {role === "supervisor" && !profileId && tab === "regchange" && <RegChange />}
          {role === "supervisor" && !profileId && tab === "crosswalk" && <FrameworkCrosswalk />}
          {role === "supervisor" && !profileId && tab === "examinerroom" && <ExaminerRoom />}

          {/* AGENT */}
          {role === "partner" && tab === "profile" && <Profile {...{ store, agents, id: actingPartner, now, supervisor: false, updateReview, setModal, onScreen: fetchScreening, screenLoading: screeningLoading }} />}
          {role === "partner" && tab === "standing" && <Standing {...{ agent: baseAll().find(a => a.id === actingPartner), slice: store.agents[actingPartner], store }} />}
          {role === "partner" && tab === "lifecycleA" && <LifecycleShow />}
          {role === "partner" && tab === "reportingA" && <AgentReporting {...{ store, agentId: actingPartner, onSubmit: (tid) => setModal({ t: "report", typeId: tid, agentId: actingPartner }) }} />}
          {role === "partner" && tab === "intelA" && <Intel {...{ store, supervisor: false, jur: baseAll().find(a => a.id === actingPartner).jur, setModal, agentId: actingPartner, live, onRefresh: () => fetchLive([baseAll().find(a => a.id === actingPartner).jur, "United States"]), jurs: [baseAll().find(a => a.id === actingPartner).jur, "United States"] }} />}
          {role === "partner" && tab === "trainingA" && <AgentTraining {...{ slice: store.agents[actingPartner], onComplete: (cid) => completeCourse(actingPartner, cid) }} />}
          {role === "partner" && tab === "ddA" && <DDFile {...{ slice: store.agents[actingPartner], base: baseAll().find(a => a.id === actingPartner), screening: store.agents[actingPartner]?.screening, onScreen: () => fetchScreening(actingPartner), screenLoading: !!screeningLoading[actingPartner] }} />}
          {role === "partner" && tab === "slaA" && <ObligationsView partnerId={actingPartner} base={baseAll().find(a => a.id === actingPartner)} supervisor={false} />}
          {role === "partner" && tab === "reviewsA" && <Reviews {...{ store, partnerName, updateReview, supervisor: false, agentId: actingPartner, setModal }} />}
          {role === "partner" && tab === "commsA" && <Comms {...{ store, agents, supervisor: false, agentId: actingPartner, onAck: ackBroadcast, setModal }} />}
        </main>
      </div>

      {modal?.t === "report" && <ReportModal type={REPORT_TYPES.find(r => r.id === modal.typeId)} onClose={() => setModal(null)} onSubmit={(v) => submitReport(modal.agentId, modal.typeId, v)} />}
      {modal?.t === "intel" && <IntelModal onClose={() => setModal(null)} onSubmit={(v) => shareIntel(modal.agentId, v)} />}
      {modal?.t === "broadcast" && <BroadcastModal onClose={() => setModal(null)} onSubmit={broadcast} />}
      {modal?.t === "speakup" && <SpeakupModal onClose={() => setModal(null)} onSubmit={raiseSpeakup} />}
      {modal?.t === "finding" && <FindingModal review={store.reviews[modal.caseId]} onClose={() => setModal(null)} onSave={(f) => { updateReview(modal.caseId, { findings: [...store.reviews[modal.caseId].findings, f] }); setModal(null); flash("Finding logged"); }} />}
      {toast && <div className="toast"><Check size={16} color="var(--gold)" /> {toast}</div>}
    </div>
  );
}

/* ============================================================================
   SUPERVISOR — Oversight dashboard
============================================================================ */
function Oversight({ agents, store, openProfile }) {
  const rows = agents.map(({ base, slice }) => {
    const sc = overall(base), r = ratingFor(sc), tr = trendOf(base), dd = ddStatus(slice);
    const open = Object.values(store.reviews).filter(rv => rv.agent === base.id && rv.status !== "Closed");
    const findings = open.reduce((n, rv) => n + (rv.findings?.filter(f => f.status === "Open").length || 0), 0);
    const ew = earlyWarnings(base, slice, store.reviews);
    return { base, slice, sc, r, tr, dd, training: trainingRate(slice), findings, openReviews: open.length, ew };
  });
  const jurAgg = useMemo(() => {
    const m = {}; rows.forEach(x => { (m[x.base.jur] ||= []).push(x.sc); });
    return Object.entries(m).map(([jur, arr]) => ({ jur, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), n: arr.length }));
  }, [rows]);
  const escalations = rows.flatMap(x => x.ew.map(w => ({ agent: x.base.name, w, c: x.r.c }))).slice(0, 8);

  return (
    <>
      <h1 className="h1">Third-party oversight dashboard</h1>
      <p className="sub">Live status across every partner — payout, banking, card and processor — with partner-as-customer controls (due diligence) and partner-as-channel controls (reporting, monitoring) in one view. Anything a partner files syncs here automatically.</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <Kpi label="Partners under oversight" value={agents.length} />
        <Kpi label="High / critical risk" value={rows.filter(x => x.r.t === "High" || x.r.t === "Critical").length} accent="var(--red)" />
        <Kpi label="Open program reviews" value={Object.values(store.reviews).filter(r => r.status !== "Closed").length} />
        <Kpi label="Overdue obligations" value={store.tasks.filter(t => t.status === "Open" && slaStatus(t.due).cd < 0).length + Object.values(store.reviews).filter(r => r.status !== "Closed" && slaStatus(r.foDue).cd < 0).length} accent="var(--amber)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", marginTop: 13 }}>
        <div className="card">
          <h3>Jurisdiction risk heat map</h3>
          <div className="heat">
            {jurAgg.map(j => { const r = ratingFor(j.avg); return (
              <div className="tile" key={j.jur} style={{ borderColor: r.c + "66" }}>
                <div className="row" style={{ justifyContent: "space-between" }}><b>{j.jur}</b><Globe size={14} color={r.c} /></div>
                <div className="kpi" style={{ fontSize: 22, color: r.c, marginTop: 6 }}>{j.avg}</div>
                <div className="muted" style={{ fontSize: 11 }}>{j.n} partner{j.n > 1 ? "s" : ""} · {r.t} risk</div>
              </div>
            ); })}
          </div>
        </div>
        <div className="card">
          <h3>Escalations & early-warning</h3>
          {escalations.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>No escalations.</div> :
            escalations.map((e, i) => (
              <div className="row" key={i} style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #e7e9f2" }}>
                <span style={{ fontSize: 12.5 }}><AlertTriangle size={13} color={e.c} style={{ verticalAlign: "-2px", marginRight: 6 }} />{e.w}</span>
                <span className="muted mono" style={{ fontSize: 11 }}>{e.agent}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 13 }}>
        <h3>Partners by category (service relationship to Mal)</h3>
        <div className="heat">
          {CATEGORIES.map(cat => { const inCat = rows.filter(x => x.base.category === cat.id); if (!inCat.length) return null; const avg = Math.round(inCat.reduce((s, x) => s + x.sc, 0) / inCat.length); const rr = ratingFor(avg); return (
            <div className="tile" key={cat.id} style={{ borderColor: cat.color + "55" }}>
              <div className="row" style={{ gap: 8 }}><span className="catdot" style={{ background: cat.color }} /><b style={{ fontSize: 13 }}>{cat.id}</b></div>
              <div className="kpi" style={{ fontSize: 20, marginTop: 7, color: rr.c }}>{avg}</div>
              <div className="muted" style={{ fontSize: 11 }}>{inCat.length} partner{inCat.length > 1 ? "s" : ""} · avg score · {cat.note}</div>
            </div>
          ); })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 13 }}>
        <h3>All partners</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Partner</th><th>Category</th><th>Jurisdiction</th><th>Score</th><th>Risk</th><th>Trend</th><th>Training</th><th>DD</th><th>Open findings</th><th>Reviews</th><th></th></tr></thead>
            <tbody>{rows.slice().sort((a, b) => CATEGORIES.findIndex(c => c.id === a.base.category) - CATEGORIES.findIndex(c => c.id === b.base.category)).map(x => (
              <tr key={x.base.id}>
                <td style={{ fontWeight: 700 }}>{x.base.name}</td>
                <td><span className="chip" style={{ background: (CATEGORIES.find(c => c.id === x.base.category)?.color || "#888") + "22", color: CATEGORIES.find(c => c.id === x.base.category)?.color || "#888" }}>{x.base.category}</span></td>
                <td>{x.base.jur}</td>
                <td className="mono" style={{ color: x.r.c, fontWeight: 700 }}>{x.sc}</td>
                <td><span className="chip" style={{ background: x.r.c + "22", color: x.r.c }}>{x.r.t}</span></td>
                <td>{x.tr > 0 ? <TrendingUp size={15} color="var(--green)" /> : x.tr < 0 ? <TrendingDown size={15} color="var(--red)" /> : <Minus size={15} color="var(--muted)" />}</td>
                <td className="mono">{x.training}%</td>
                <td className="mono">{x.dd.done}/{x.dd.total}</td>
                <td className="mono" style={{ color: x.findings ? "var(--red)" : "var(--muted)" }}>{x.findings}</td>
                <td className="mono">{x.openReviews}</td>
                <td><button className="btn ghost" onClick={() => openProfile(x.base.id)}>Open <ChevronRight size={13} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, accent, onClick }) {
  return <div className="card" style={{ cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
    <h3>{label}</h3><div className="kpi" style={{ color: accent || "var(--text)" }}>{value}</div>
    {sub && <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>{sub}</div>}
  </div>;
}

/* ============================================================================
   ARD-1 — Supervisor Oversight Dashboard
============================================================================ */
const JUR_CRAM = {
  "Pakistan":             { cram: "High",   fatf: "Grey-listed (historical)",  supervisor: "SBP / FMU",     freq: "Annual" },
  "Egypt":                { cram: "Medium", fatf: "Standard monitoring",        supervisor: "CBE / EMLCU",   freq: "3 years" },
  "Bangladesh":           { cram: "High",   fatf: "Enhanced follow-up",         supervisor: "BFIU / BB",     freq: "Annual" },
  "Turkey":               { cram: "High",   fatf: "FATF member · MER 2019",     supervisor: "MASAK / BDDK",  freq: "Annual" },
  "Indonesia":            { cram: "Medium", fatf: "Exited grey list Jun 2023",  supervisor: "PPATK / OJK",   freq: "3 years" },
  "Philippines":          { cram: "High",   fatf: "Grey-listed",                supervisor: "AMLC / BSP",    freq: "Annual" },
  "United Arab Emirates": { cram: "High",   fatf: "Enhanced follow-up",         supervisor: "CBUAE / EOCN",  freq: "Annual" },
  "United States":        { cram: "Low",    fatf: "FATF member",                supervisor: "FinCEN / OFAC", freq: "5 years" },
  "Global":               { cram: "Medium", fatf: "Multi-jurisdictional",       supervisor: "Various",        freq: "3 years" },
};
const CRAM_C = { High: "#ef4444", Medium: "#f59e0b", Low: "#17a34a" };

function ARD1Dashboard({ agents, store, openProfile }) {
  const [logFilter, setLogFilter] = useState("All");
  const today = new Date();
  const qNum = Math.floor(today.getMonth() / 3) + 1;
  const qLabel = "Q" + qNum + " " + today.getFullYear();
  const qStart = new Date(today.getFullYear(), (qNum - 1) * 3, 1);

  const rows = agents.map(({ base, slice }) => {
    const sc = overall(base), r = ratingFor(sc), tr = trendOf(base), dd = ddStatus(slice);
    const training = trainingRate(slice);
    const allRevs = Object.values(store.reviews).filter(rv => rv.agent === base.id);
    const openRevs = allRevs.filter(rv => rv.status !== "Closed");
    const findings = openRevs.reduce((n, rv) => n + (rv.findings?.filter(f => f.status === "Open").length || 0), 0);
    const qRevs = allRevs.filter(rv => rv.start && new Date(rv.start) >= qStart);
    const qDone = qRevs.filter(rv => rv.status === "Closed").length;
    const qOverdue = qRevs.filter(rv => rv.status !== "Closed" && rv.foDue && slaStatus(rv.foDue).cd < 0).length;
    const cram = JUR_CRAM[base.jur] || { cram: "Medium", fatf: "—", supervisor: "—", freq: "Annual" };
    return { base, slice, sc, r, tr, dd, training, findings, openRevs, qRevs, qDone, qOverdue, cram };
  });

  const avgScore = Math.round(rows.reduce((s, x) => s + x.sc, 0) / rows.length);
  const openTotal = rows.reduce((n, x) => n + x.openRevs.length, 0);
  const findingsTotal = rows.reduce((n, x) => n + x.findings, 0);
  const qRevsDone = rows.reduce((n, x) => n + x.qDone, 0);
  const qRevsTotal = rows.reduce((n, x) => n + x.qRevs.length, 0);

  const jurAgg = useMemo(() => {
    const m = {};
    rows.forEach(x => {
      if (!m[x.base.jur]) m[x.base.jur] = { jur: x.base.jur, scores: [], count: 0, cram: x.cram };
      m[x.base.jur].scores.push(x.sc);
      m[x.base.jur].count++;
    });
    return Object.values(m)
      .map(j => ({ ...j, avg: Math.round(j.scores.reduce((a, b) => a + b, 0) / j.scores.length) }))
      .sort((a, b) => a.avg - b.avg);
  }, [agents, store.reviews]);

  const byCat = useMemo(() => {
    const m = {};
    rows.forEach(x => {
      const cat = x.base.category;
      if (!m[cat]) { const cd = CATEGORIES.find(c => c.id === cat); m[cat] = { label: cat, note: cd?.note || "", color: cd?.color || "#8000ff", count: 0, scores: [], openRevs: 0 }; }
      m[cat].count++;
      m[cat].scores.push(x.sc);
      m[cat].openRevs += x.openRevs.length;
    });
    return Object.values(m).map(c => ({ ...c, avg: Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length) }));
  }, [agents, store.reviews]);

  const LOG_TYPES = ["All", "SAR", "STR", "Audit finding", "Correspondence", "Escalation", "Speak-up"];
  const KIND_COLOR = { SAR: "#ef4444", STR: "#f59e0b", "Audit finding": "#8b5cf6", Correspondence: "#1e63e9", Escalation: "#ef4444", "Speak-up": "#0ea5e9" };

  const reportingLog = useMemo(() => {
    const log = [];
    agents.forEach(({ base, slice }) => {
      const reg = slice?.registers || {};
      (reg.sar || []).forEach(s => log.push({ partner: base.name, jur: base.jur, kind: "SAR", ref: s.ref, at: s.at, summary: s.summary, sev: "crit" }));
      (reg.str || []).forEach(s => log.push({ partner: base.name, jur: base.jur, kind: "STR", ref: s.ref, at: s.at, summary: s.summary, sev: "high" }));
      (reg.audit || []).forEach(s => log.push({ partner: base.name, jur: base.jur, kind: "Audit finding", ref: s.ref, at: s.at, summary: s.summary, sev: "high" }));
      (reg.correspondence || []).forEach(s => log.push({ partner: base.name, jur: base.jur, kind: "Correspondence", ref: s.ref, at: s.at, summary: s.summary, sev: "med" }));
    });
    Object.values(store.reviews).forEach(rv => {
      (rv.findings || []).filter(f => f.status === "Open" && (f.sev === "Critical" || f.sev === "High")).forEach(f => {
        const partnerBase = agents.find(a => a.base.id === rv.agent)?.base;
        log.push({ partner: partnerBase?.name || rv.agent, jur: partnerBase?.jur || rv.country || "—", kind: "Escalation", ref: f.ref || rv.id, at: rv.start || "", summary: f.desc || rv.reason, sev: f.sev === "Critical" ? "crit" : "high" });
      });
    });
    (store.speakup || []).forEach(s => log.push({ partner: s.anon ? "Anonymous" : s.from, jur: "Internal", kind: "Speak-up", ref: s.id, at: s.at, summary: s.topic + (s.body ? " — " + s.body.slice(0, 55) : ""), sev: "med" }));
    return log.filter(l => l.at).sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [agents, store.reviews, store.speakup]);

  const visibleLog = logFilter === "All" ? reportingLog : reportingLog.filter(l => l.kind === logFilter);
  const critAlerts = reportingLog.filter(l => l.sev === "crit").length;
  const highAlerts = reportingLog.filter(l => l.sev === "high").length;

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <h1 className="h1">ARD-1 · Supervisor Oversight Dashboard</h1>
          <p className="sub">Third-party risk oversight programme record — partner scoring, quarterly programme reviews, jurisdiction CRAM assessment, and consolidated escalation log.</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
          <span className="chip" style={{ background: "#8000ff22", color: "#8000ff", fontWeight: 700, display: "inline-block", marginBottom: 4 }}>ARD-1</span><br />
          <span className="muted mono" style={{ fontSize: 11 }}>{today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {qLabel}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <Kpi label="Partners under oversight" value={agents.length} sub={CATEGORIES.length + " categories"} />
        <Kpi label="Network avg compliance score" value={avgScore} accent={ratingFor(avgScore).c} sub={ratingFor(avgScore).t + " risk"} />
        <Kpi label="Open programme reviews" value={openTotal} accent={openTotal > 0 ? "var(--amber)" : undefined} sub={findingsTotal + " open findings"} />
        <Kpi label="Critical & high alerts" value={critAlerts + highAlerts} accent={critAlerts > 0 ? "var(--red)" : highAlerts > 0 ? "var(--amber)" : undefined} sub={critAlerts + " critical · " + highAlerts + " high"} />
        <Kpi label={qLabel + " reviews"} value={qRevsDone + "/" + (qRevsTotal || agents.length)} accent={qRevsTotal > 0 && qRevsDone < qRevsTotal ? "var(--amber)" : qRevsTotal > 0 ? "var(--green)" : undefined} sub={qRevsDone < qRevsTotal ? "outstanding" : qRevsTotal > 0 ? "all conducted" : "none scheduled"} />
      </div>

      {/* CRAM heat map + Escalations */}
      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 13 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Jurisdiction risk · CRAM assessment</h3>
            <span className="muted mono" style={{ fontSize: 11 }}>MAL-PRC-ONB-01 v2.0</span>
          </div>
          <div className="heat">
            {jurAgg.map(j => {
              const sr = ratingFor(j.avg);
              const cr = CRAM_C[j.cram.cram] || "#f59e0b";
              return (
                <div className="tile" key={j.jur} style={{ borderColor: sr.c + "66" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <b style={{ fontSize: 12.5 }}>{j.jur}</b>
                    <span className="chip" style={{ background: cr + "22", color: cr, fontSize: 10, padding: "1px 5px", flexShrink: 0, marginLeft: 4 }}>{j.cram.cram}</span>
                  </div>
                  <div className="kpi" style={{ fontSize: 20, color: sr.c, margin: "4px 0 2px" }}>{j.avg}</div>
                  <div className="muted" style={{ fontSize: 10.5, lineHeight: 1.5 }}>
                    {j.count} partner{j.count > 1 ? "s" : ""} · {sr.t} risk<br />
                    {j.cram.fatf}<br />
                    <span>{j.cram.supervisor}</span><br />
                    <span>{j.cram.freq} review</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3>Escalations & interdiction alerts</h3>
          {reportingLog.filter(l => l.sev === "crit" || l.sev === "high").length === 0
            ? <div className="muted" style={{ fontSize: 13 }}>No active escalations.</div>
            : reportingLog.filter(l => l.sev === "crit" || l.sev === "high").slice(0, 7).map((e, i) => (
              <div key={i} style={{ padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12.5 }}>
                    <AlertTriangle size={13} color={SEV[e.sev].c} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                    <b>{e.kind}</b> · {e.partner}
                  </span>
                  <span className="chip" style={{ background: SEV[e.sev].c + "22", color: SEV[e.sev].c, fontSize: 10, flexShrink: 0 }}>{SEV[e.sev].t}</span>
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2, paddingLeft: 18 }}>{e.summary?.slice(0, 100)}{e.summary?.length > 100 ? "…" : ""}</div>
                <div className="muted mono" style={{ fontSize: 10, marginTop: 1, paddingLeft: 18 }}>{e.jur} · {e.ref}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Quarterly reviews + Partners by category */}
      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", marginTop: 13 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Programme reviews · {qLabel}</h3>
            <span className="muted" style={{ fontSize: 12 }}>{qRevsDone} of {qRevsTotal || agents.length} reviewed this quarter</span>
          </div>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Partner</th><th>Jurisdiction</th><th>Q reviews</th><th>Conducted</th><th>Overdue</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map(({ base, qRevs, qDone, qOverdue }) => (
                  <tr key={base.id} style={{ cursor: "pointer" }} onClick={() => openProfile(base.id)}>
                    <td style={{ fontWeight: 600 }}>{base.name}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{base.jur}</td>
                    <td className="mono">{qRevs.length || "—"}</td>
                    <td className="mono">{qDone > 0 ? <span style={{ color: "var(--green)" }}>{qDone}</span> : <span className="muted">0</span>}</td>
                    <td className="mono">{qOverdue > 0 ? <span style={{ color: "var(--red)", fontWeight: 700 }}>{qOverdue}</span> : "—"}</td>
                    <td>
                      {qOverdue > 0 ? <span className="chip" style={{ background: "#ef444422", color: "var(--red)", fontSize: 11 }}>Overdue</span>
                        : qDone === qRevs.length && qRevs.length > 0 ? <span className="chip" style={{ background: "#17a34a22", color: "var(--green)", fontSize: 11 }}>Done</span>
                        : qRevs.length > 0 ? <span className="chip" style={{ background: "#f59e0b22", color: "var(--amber)", fontSize: 11 }}>In progress</span>
                        : <span className="chip" style={{ background: "var(--line)", color: "var(--muted)", fontSize: 11 }}>Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Partners by category</h3>
          {byCat.map(cat => {
            const r = ratingFor(cat.avg);
            return (
              <div key={cat.label} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: cat.color, display: "inline-block", flexShrink: 0 }} />
                    <b style={{ fontSize: 13 }}>{cat.label}</b>
                    <span className="chip" style={{ background: "var(--line)", fontSize: 10 }}>{cat.count}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: r.c, fontSize: 17 }}>{cat.avg}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, paddingLeft: 17, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="chip" style={{ background: r.c + "22", color: r.c, fontSize: 10 }}>{r.t} risk</span>
                  {cat.openRevs > 0 && <span style={{ fontSize: 11, color: "var(--amber)" }}>{cat.openRevs} open review{cat.openRevs > 1 ? "s" : ""}</span>}
                  <span className="muted" style={{ fontSize: 11 }}>{cat.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Partners oversight register */}
      <div className="card" style={{ marginTop: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Partners oversight register</h3>
          <span className="muted mono" style={{ fontSize: 11 }}>ARD-1 · {today.toLocaleDateString("en-GB")}</span>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Partner</th><th>Category</th><th>Jurisdiction</th><th>Score</th><th>Risk</th><th>Trend</th><th>Training</th><th>DD</th><th>Open findings</th><th>Reviews</th></tr>
            </thead>
            <tbody>
              {rows.slice().sort((a, b) => CATEGORIES.findIndex(c => c.id === a.base.category) - CATEGORIES.findIndex(c => c.id === b.base.category)).map(x => {
                const catColor = CATEGORIES.find(c => c.id === x.base.category)?.color || "#888";
                return (
                  <tr key={x.base.id} style={{ cursor: "pointer" }} onClick={() => openProfile(x.base.id)}>
                    <td style={{ fontWeight: 700 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: catColor, display: "inline-block", marginRight: 7, verticalAlign: "middle" }} />
                      {x.base.name}
                    </td>
                    <td><span className="chip" style={{ background: catColor + "22", color: catColor, fontSize: 10 }}>{x.base.category}</span></td>
                    <td className="muted" style={{ fontSize: 12 }}>{x.base.jur}</td>
                    <td className="mono" style={{ fontWeight: 700, color: x.r.c }}>{x.sc}</td>
                    <td><span className="chip" style={{ background: x.r.c + "22", color: x.r.c, fontSize: 11 }}>{x.r.t}</span></td>
                    <td>{x.tr > 0 ? <TrendingUp size={14} color="var(--green)" /> : x.tr < 0 ? <TrendingDown size={14} color="var(--red)" /> : <Minus size={14} color="var(--muted)" />}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 40, height: 4, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: x.training + "%", height: "100%", background: x.training >= 80 ? "var(--green)" : x.training >= 50 ? "var(--amber)" : "var(--red)", borderRadius: 3 }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11 }}>{x.training}%</span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: x.dd.done === x.dd.total ? "var(--green)" : "var(--amber)" }}>{x.dd.done}/{x.dd.total}</td>
                    <td className="mono" style={{ color: x.findings > 0 ? "var(--red)" : "var(--muted)", fontWeight: x.findings > 0 ? 700 : 400 }}>{x.findings || "—"}</td>
                    <td className="mono">{x.openRevs.length > 0 ? <span style={{ color: "var(--amber)" }}>{x.openRevs.length} open</span> : <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reporting & escalation log */}
      <div className="card" style={{ marginTop: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Reporting & escalation log</h3>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {LOG_TYPES.map(f => (
              <button key={f} className="btn ghost" style={{ fontSize: 11, padding: "2px 8px", ...(logFilter === f ? { background: "#8000ff22", color: "#8000ff", borderColor: "#8000ff44" } : {}) }} onClick={() => setLogFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
        {visibleLog.length === 0
          ? <div className="muted" style={{ fontSize: 13 }}>No entries match this filter.</div>
          : (
            <div className="tablewrap">
              <table>
                <thead><tr><th>Date</th><th>Partner</th><th>Jurisdiction</th><th>Type</th><th>Reference</th><th>Summary</th><th>Severity</th></tr></thead>
                <tbody>
                  {visibleLog.slice(0, 40).map((e, i) => (
                    <tr key={i}>
                      <td className="muted mono" style={{ whiteSpace: "nowrap", fontSize: 11 }}>{e.at ? fmtDate(e.at) : "—"}</td>
                      <td style={{ fontWeight: 600, fontSize: 12.5 }}>{e.partner}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{e.jur}</td>
                      <td><span className="chip" style={{ background: (KIND_COLOR[e.kind] || "#888") + "22", color: KIND_COLOR[e.kind] || "#888", fontSize: 10 }}>{e.kind}</span></td>
                      <td className="mono" style={{ fontSize: 11 }}>{e.ref}</td>
                      <td style={{ fontSize: 12 }}>{e.summary?.slice(0, 90)}{e.summary?.length > 90 ? "…" : ""}</td>
                      <td><span className="chip" style={{ background: (SEV[e.sev]?.c || "#888") + "22", color: SEV[e.sev]?.c || "#888", fontSize: 10 }}>{SEV[e.sev]?.t || e.sev}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </>
  );
}

/* ============================================================================
   Agents directory
============================================================================ */
function Directory({ agents, store, openProfile }) {
  const [q, setQ] = useState("");
  const list = agents.filter(a => a.base.name.toLowerCase().includes(q.toLowerCase()) || a.base.jur.toLowerCase().includes(q.toLowerCase()) || (a.base.category || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1 className="h1">Partners</h1>
      <p className="sub">Every partner that serves Mal, grouped by the service relationship — payout partners in one category, banking, card &amp; settlement, and technology/processors in others. Open any partner for its compliance profile and timeline.</p>
      <div className="row" style={{ background: "#f5f6fb", border: "1px solid var(--line)", borderRadius: 9, padding: "0 10px", maxWidth: 360, marginBottom: 16 }}>
        <Search size={15} color="var(--muted)" /><input className="input" style={{ border: "none", background: "transparent" }} placeholder="Search partners, jurisdictions or category" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {CATEGORIES.map(cat => {
        const inCat = list.filter(a => a.base.category === cat.id);
        if (inCat.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 20 }}>
            <div className="row" style={{ gap: 9, marginBottom: 10 }}>
              <span className="catdot" style={{ background: cat.color }} />
              <b style={{ fontSize: 14 }}>{cat.id}</b>
              <span className="muted" style={{ fontSize: 12 }}>· {cat.note} · {inCat.length}</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
              {inCat.map(({ base, slice }) => { const sc = overall(base), r = ratingFor(sc); return (
                <div className="card" key={base.id} style={{ cursor: "pointer" }} onClick={() => openProfile(base.id)}>
                  <div className="row" style={{ gap: 12 }}>
                    <div className="bigav" style={{ width: 48, height: 48, fontSize: 18 }}>{base.name.slice(0, 2).toUpperCase()}</div>
                    <div><div style={{ fontWeight: 800 }}>{base.name}</div><div className="muted" style={{ fontSize: 12 }}>{base.jur} · {base.tier}</div></div>
                    <span className="spacer" /><div className="ring" style={{ background: `conic-gradient(${r.c} ${sc * 3.6}deg,#e7e9f2 0)` }}><div className="hole" style={{ color: r.c }}>{sc}</div></div>
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 9 }}>{base.relationship}</div>
                  <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
                    <span className="chip" style={{ background: r.c + "22", color: r.c }}>{r.t} risk</span>
                    <span className="muted" style={{ fontSize: 12 }}>Training {trainingRate(slice)}%</span>
                  </div>
                </div>
              ); })}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ============================================================================
   Profile (social-style) — overview + activity feed
============================================================================ */
function Profile({ store, agents, id, back, now, supervisor, updateReview, setModal, onScreen, screenLoading }) {
  const base = AGENTS_BASE.find(a => a.id === id) || (store.partners || []).find(a => a.id === id); const slice = store.agents[id];
  if (!base || !slice) return null;
  const [t, setT] = useState("feed");
  const sc = overall(base), r = ratingFor(sc), tr = trendOf(base);
  const myReviews = Object.values(store.reviews).filter(rv => rv.agent === id);
  return (
    <>
      {supervisor && <button className="btn ghost" style={{ marginBottom: 12 }} onClick={back}>← All partners</button>}
      <div className="card">
        <div className="profhead">
          <div className="bigav">{base.name.slice(0, 2).toUpperCase()}</div>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{base.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>{base.juris.join(" · ")} · {base.tier} partner {base.live ? "· LIVE" : ""}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}><Lock size={11} style={{ verticalAlign: "-1px" }} /> {base.license}</div>
          </div>
          <span className="spacer" />
          {supervisor && <div style={{ textAlign: "center" }}>
            <div className="ring" style={{ width: 58, height: 58, margin: "0 auto", background: `conic-gradient(${r.c} ${sc * 3.6}deg,#e7e9f2 0)` }}><div className="hole" style={{ fontSize: 15, color: r.c }}>{sc}</div></div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{r.t} risk {tr > 0 ? "▲" : tr < 0 ? "▼" : ""}</div>
          </div>}
        </div>
        <div className="row" style={{ gap: 18, marginTop: 12, flexWrap: "wrap" }}>
          <Mini label="Training" v={trainingRate(slice) + "%"} />
          <Mini label="DD complete" v={`${ddStatus(slice).done}/${ddStatus(slice).total}`} />
          <Mini label="Open reviews" v={myReviews.filter(x => x.status !== "Closed").length} />
          <Mini label="SAR / STR filed" v={`${slice.registers.sar.length} / ${slice.registers.str.length}`} />
          <Mini label="Open findings" v={myReviews.reduce((n, rv) => n + (rv.findings?.filter(f => f.status === "Open").length || 0), 0)} />
        </div>
      </div>

      <div className="tabs2">
        {[["feed","Activity feed"],["overview","Overview"],["filings","Filings"],["reviews","Reviews"],["dd","Due diligence"],["sla","Obligations & SLA"]].map(([k,lab]) => <button key={k} className={t === k ? "on" : ""} onClick={() => setT(k)}>{lab}</button>)}
      </div>

      {t === "feed" && (
        <div className="card">
          {slice.feed.map(f => (
            <div className="feeditem" key={f.id}>
              <div className="av">{kindIcon(f.kind)}</div>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span><span className="chip" style={{ background: "#f5f6fb", color: feedColor(f.kind) }}>{f.kind}</span> <b style={{ fontSize: 13 }}>{f.actor}</b></span>
                  <span className="muted mono" style={{ fontSize: 11 }}>{fmtDT(f.at)}</span>
                </div>
                <div style={{ fontSize: 13.5, marginTop: 5 }}>{f.text}</div>
                <div className="row muted" style={{ gap: 16, marginTop: 7, fontSize: 11.5 }}>
                  <span><Paperclip size={12} /> attach</span><span><MessageSquare size={12} /> comment</span>{supervisor && <span style={{ color: "var(--gold2)" }}><Check size={12} /> supervisory review</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {t === "overview" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="card"><h3>Key compliance contacts</h3>
            {base.contacts.map((c, i) => <div key={i} className="row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e7e9f2" }}><span style={{ fontSize: 13 }}><b>{c.name}</b> <span className="muted">· {c.role}</span></span><span className="muted mono" style={{ fontSize: 11 }}>{c.email}</span></div>)}
          </div>
          {supervisor && base.agreement && <div className="card" style={{ gridColumn: "1 / -1" }}><h3>Agreement & key terms</h3>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <DDRow label="Counterparty entity" v={base.agreement.entity} /><DDRow label="Mal counterparty" v={base.agreement.counterparty} />
              <DDRow label="Document" v={base.agreement.doc} /><DDRow label="Status" v={base.agreement.status} />
              <DDRow label="Effective" v={base.agreement.effective} /><DDRow label="Term" v={base.agreement.term} />
              <DDRow label="Notice / cure" v={base.agreement.notice} /><DDRow label="Governing law" v={base.agreement.governingLaw} />
              <DDRow label="Commercial terms" v={base.agreement.commercial} />{base.agreement.signedFor ? <DDRow label="Signed for" v={base.agreement.signedFor} /> : null}
            </div>
          </div>}
          {supervisor && base.kdp && <div className="card" style={{ gridColumn: "1 / -1" }}><h3>Key individuals — adverse-media & sanctions subjects</h3>
            {base.kdp.map((k, i) => <DDRow key={i} label={k.role} v={k.name} />)}
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>These names are screened for adverse media, sanctions and PEP exposure by the screening engine (Due diligence tab). Full UBO verification is conducted by Mal against public registers.</div>
          </div>}
          {supervisor && <div className="card"><h3>Historical compliance rating</h3>
            <Spark data={base.history} />
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Last 5 quarters · current {sc}</div>
          </div>}
          {supervisor && <div className="card" style={{ gridColumn: "1 / -1" }}><h3>Score components (risk-based)</h3>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {Object.keys(SCORE_W).map(k => <ScoreBar key={k} label={SCORE_LABEL[k]} v={base.scores[k]} />)}
            </div>
          </div>}
        </div>
      )}

      {t === "filings" && <AgentRegisters slice={slice} />}

      {t === "reviews" && (
        <div className="grid" style={{ gap: 11 }}>
          {myReviews.length === 0 ? <div className="muted">No program reviews.</div> : myReviews.map(rv => <ReviewCard key={rv.id} rv={rv} supervisor={supervisor} updateReview={updateReview} setModal={setModal} />)}
        </div>
      )}
      {t === "dd" && <DDView slice={slice} base={base} supervisor={supervisor} screening={slice.screening} onScreen={() => onScreen && onScreen(id)} screenLoading={!!(screenLoading && screenLoading[id])} />}
      {t === "sla" && <ObligationsView partnerId={id} base={base} supervisor={supervisor} />}
    </>
  );
}
function Mini({ label, v }) { return <div><div className="kpi" style={{ fontSize: 18 }}>{v}</div><div className="muted" style={{ fontSize: 11 }}>{label}</div></div>; }
function ScoreBar({ label, v }) { const c = v >= 80 ? "var(--green)" : v >= 60 ? "var(--gold)" : "var(--red)"; return (
  <div style={{ margin: "6px 0" }}><div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12 }}>{label}</span><span className="mono muted">{v}</span></div><div className="bar"><span style={{ width: v + "%", background: c }} /></div></div>
); }
function Spark({ data }) {
  const w = 220, h = 50, max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d - min) / rng) * (h - 8) - 4}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="56"><polyline fill="none" stroke="var(--gold)" strokeWidth="2.5" points={pts} /></svg>;
}
const kindIcon = (k) => { const m = { SAR: "🚩", STR: "🚩", Filing: "📄", Certification: "✔️", Audit: "🔍", Correspondence: "✉️", "Policy update": "📕", "Risk assessment": "📊", Training: "🎓", "Corrective action": "🛠️" }; return <span style={{ fontSize: 15 }}>{m[k] || "•"}</span>; };
const feedColor = (k) => ({ SAR: "var(--red)", STR: "var(--red)", Audit: "var(--violet)", Training: "var(--green)", "Policy update": "var(--blue)" }[k] || "var(--gold2)");

/* ============================================================================
   Registers (shared)
============================================================================ */
const REG_DEF = [
  { k: "sar", t: "SAR register" }, { k: "str", t: "STR register" }, { k: "fatca", t: "FATCA register" },
  { k: "crs", t: "CRS register" }, { k: "cert", t: "Certifications" }, { k: "audit", t: "Audit findings" },
  { k: "correspondence", t: "Regulatory correspondence" }, { k: "corrective", t: "Corrective actions" },
];
function AgentRegisters({ slice }) {
  return <div className="grid" style={{ gap: 11 }}>
    {REG_DEF.map(rd => (
      <div className="card" key={rd.k}><h3>{rd.t}</h3>
        {slice.registers[rd.k].length === 0 ? <div className="muted" style={{ fontSize: 12.5 }}>No entries.</div> :
          <div className="tablewrap"><table><thead><tr><th>Ref</th><th>Date</th><th>Status</th><th>Summary</th></tr></thead>
            <tbody>{slice.registers[rd.k].map((r, i) => <tr key={i}><td className="mono">{r.ref}</td><td className="muted mono">{fmtDate(r.at)}</td><td><span className="chip" style={{ background: "rgba(52,211,153,.15)", color: "var(--green)" }}>{r.status}</span></td><td>{r.summary}</td></tr>)}</tbody></table></div>}
      </div>
    ))}
  </div>;
}
function AgentRegisterAll({ slice }) { return <AgentRegisters slice={slice} />; }

/* ============================================================================
   Program reviews & SLA  (payout-agent-case-review model)
============================================================================ */
function Reviews({ store, partnerName, updateReview, supervisor, agentId, setModal }) {
  let list = Object.values(store.reviews);
  if (!supervisor) list = list.filter(r => r.agent === agentId);
  return (
    <>
      <h1 className="h1">{supervisor ? "Program reviews & SLA management" : "My program reviews"}</h1>
      <p className="sub">{supervisor ? "Annual, periodic, risk-based and enhanced reviews with live SLA countdowns to the FO due date. Findings-or-higher requires a finding letter, remediation, and clearance before close." : "Reviews of your program. Respond to findings and complete remediation; clearance is issued when all items are done."}</p>
      <div className="grid" style={{ gap: 11 }}>
        {list.length === 0 ? <div className="muted">No reviews.</div> : list.map(rv => (
          <ReviewCard key={rv.id} rv={rv} partnerName={partnerName} supervisor={supervisor} updateReview={updateReview} setModal={setModal} />
        ))}
      </div>
    </>
  );
}
function ReviewCard({ rv, partnerName, supervisor, updateReview, setModal }) {
  const sla = slaStatus(rv.foDue);
  const findingsLevel = ["Findings", "Significant findings", "Critical findings"].includes(rv.level);
  const remOpen = rv.remediation.filter(x => x.status !== "Done").length;
  const closeBlocked = findingsLevel && (remOpen > 0 || !rv.cleared);
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div><b>{rv.id}</b> <span className="muted">· {partnerName ? partnerName(rv.agent) : ""} · {rv.country} · {rv.reason}</span></div>
        <div className="row" style={{ gap: 8 }}>
          <span className="chip" style={{ background: "#f5f6fb" }}>{rv.status}</span>
          {rv.level && <span className="chip" style={{ background: findingsLevel ? "rgba(248,113,113,.15)" : "rgba(52,211,153,.15)", color: findingsLevel ? "var(--red)" : "var(--green)" }}>{rv.level}</span>}
          <span className="chip" style={{ background: sla.c + "22", color: sla.c }}><Clock size={12} /> FO {fmtDate(rv.foDue)} · {rv.status === "Closed" ? "—" : (sla.cd + "bd · " + sla.st)}</span>
        </div>
      </div>
      <div className="row muted" style={{ gap: 18, marginTop: 8, fontSize: 12, flexWrap: "wrap" }}>
        <span>Assigned: {rv.assignedTo}</span>
        {rv.txStart && <span>Tx window: {rv.txStart} → {rv.txEnd} ({rv.txGroup})</span>}
      </div>
      {rv.findings.length > 0 && (
        <div className="tablewrap" style={{ marginTop: 10 }}><table>
          <thead><tr><th>Ref</th><th>Finding</th><th>Severity</th><th>Standard</th><th>Status</th></tr></thead>
          <tbody>{rv.findings.map((f, i) => <tr key={i}><td className="mono">{f.ref}</td><td>{f.desc}</td><td><span className="chip" style={{ background: (SEV[f.sev.toLowerCase()]?.c || "#888") + "22", color: SEV[f.sev.toLowerCase()]?.c || "#888" }}>{f.sev}</span></td><td className="muted">{f.standard}</td><td>{f.status}</td></tr>)}</tbody>
        </table></div>
      )}
      {rv.remediation.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Remediation</div>
          {rv.remediation.map((m, i) => (
            <div className="row" key={i} style={{ justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e7e9f2" }}>
              <span style={{ fontSize: 12.5 }}>{m.action} <span className="muted">· {m.owner} · due {fmtDate(m.due)}</span></span>
              {!supervisor && m.status !== "Done"
                ? <button className="btn ghost" onClick={() => updateReview(rv.id, { remediation: rv.remediation.map((x, j) => j === i ? { ...x, status: "Done" } : x) })}><Check size={12} /> Mark done</button>
                : <span className="chip" style={{ background: m.status === "Done" ? "rgba(52,211,153,.15)" : "rgba(251,191,36,.15)", color: m.status === "Done" ? "var(--green)" : "var(--amber)" }}>{m.status}</span>}
            </div>
          ))}
        </div>
      )}
      {supervisor && (
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {rv.status !== "Closed" && <>
            <select className="pill" value={rv.level || ""} onChange={e => updateReview(rv.id, { level: e.target.value })}>
              <option value="">Set level…</option>{["No findings", "Observations only", "Findings", "Significant findings", "Critical findings"].map(l => <option key={l}>{l}</option>)}
            </select>
            <button className="btn ghost" onClick={() => setModal({ t: "finding", caseId: rv.id })}><Plus size={13} /> Add finding</button>
            <button className="btn ghost" onClick={() => updateReview(rv.id, { cleared: true })} disabled={!findingsLevel || remOpen > 0}><ShieldCheck size={13} /> Issue clearance</button>
            <button className="btn gold" disabled={closeBlocked || !rv.level} onClick={() => updateReview(rv.id, { status: "Closed", end: new Date().toISOString() })}><Check size={13} /> Close case</button>
          </>}
          {closeBlocked && <span className="muted" style={{ fontSize: 11.5 }}>Close blocked: findings level needs all remediation done + clearance issued.</span>}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   Reporting hub
============================================================================ */
function ReportingHub({ store, agents }) {
  const totals = {}; REPORT_TYPES.forEach(t => totals[t.id] = 0);
  agents.forEach(({ slice }) => { ["sar", "str", "fatca", "crs", "cert", "audit", "questionnaire"].forEach(k => totals[k] = (totals[k] || 0) + (slice.registers[k]?.length || 0)); });
  function exportAll() {
    try {
      const wb = XLSX.utils.book_new();
      REG_DEF.forEach(rd => {
        const rows = [["Partner", "Ref", "Date", "Status", "Summary"]];
        agents.forEach(({ base, slice }) => slice.registers[rd.k].forEach(r => rows.push([base.name, r.ref, fmtDate(r.at), r.status, r.summary])));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), rd.t.slice(0, 28));
      });
      XLSX.writeFile(wb, "Mal_Reporting_Registers.xlsx");
    } catch (e) {}
  }
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div><h1 className="h1">Reporting hub</h1><p className="sub">Every partner's regulatory submissions, centralised. Partners submit from their own workspace; everything feeds here with version, date, status and audit trail.</p></div>
        <button className="btn" onClick={exportAll}><Download size={15} /> Export registers</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {REPORT_TYPES.slice(0, 4).map(t => <Kpi key={t.id} label={t.name + " filed"} value={totals[t.id] || 0} />)}
      </div>
      <div className="card" style={{ marginTop: 13 }}>
        <h3>All submissions</h3>
        <div className="tablewrap"><table>
          <thead><tr><th>Partner</th><th>Type</th><th>Ref</th><th>Date</th><th>Status</th><th>Summary</th></tr></thead>
          <tbody>{agents.flatMap(({ base, slice }) => REG_DEF.flatMap(rd => slice.registers[rd.k].map((r, i) => (
            <tr key={base.id + rd.k + i}><td style={{ fontWeight: 700 }}>{base.name}</td><td>{rd.t.replace(" register", "")}</td><td className="mono">{r.ref}</td><td className="muted mono">{fmtDate(r.at)}</td><td><span className="chip" style={{ background: "rgba(52,211,153,.15)", color: "var(--green)" }}>{r.status}</span></td><td>{r.summary}</td></tr>
          )))).sort((a, b) => 0)}</tbody>
        </table></div>
      </div>
    </>
  );
}
function AgentReporting({ store, agentId, onSubmit }) {
  const slice = store.agents[agentId];
  return (
    <>
      <h1 className="h1">Reporting hub</h1>
      <p className="sub">Submit regulatory reports. Each submission is versioned, timestamped, added to your register, and synced to the supervisor's master dashboard.</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", marginBottom: 16 }}>
        {REPORT_TYPES.map(t => (
          <div className="card" key={t.id}>
            <div style={{ fontWeight: 700 }}>{t.name}</div>
            <div className="muted" style={{ fontSize: 12, margin: "4px 0 10px" }}>{t.reg}</div>
            <button className="btn gold" onClick={() => onSubmit(t.id)}><Send size={13} /> Submit</button>
          </div>
        ))}
      </div>
      <h3 style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".6px" }}>My registers</h3>
      <AgentRegisters slice={slice} />
    </>
  );
}

/* ============================================================================
   Intelligence library
============================================================================ */
function Intel({ store, supervisor, jur, setModal, agentId, live, onRefresh, jurs: covered }) {
  const [f, setF] = useState("All");
  let items = store.library;
  if (!supervisor && jur) items = items.filter(i => i.jur === jur);
  const jurs = ["All", ...Array.from(new Set(store.library.map(i => i.jur)))];
  if (f !== "All") items = items.filter(i => i.jur === f);
  const liveItems = (live?.items || []).filter(l => !jur || l.jur === jur || l.jur === "United States" || l.jur === "Global");
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div><h1 className="h1">{supervisor ? "Regulatory intelligence library" : "Jurisdiction intelligence"}</h1>
          <p className="sub">{supervisor ? "Live online fraud, sanctions and regulatory news for your covered corridors — plus updates shared by partners." : `Live news for ${jur} and US regulations, plus what the network shares.`}</p></div>
        {!supervisor && <button className="btn gold" onClick={() => setModal({ t: "intel", agentId })}><Plus size={14} /> Share update</button>}
      </div>

      {/* Live online feed */}
      <div className="card" style={{ marginBottom: 14, borderColor: "var(--gold)" }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0, color: "var(--gold)" }}><Radio size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Live online — fraud · sanctions · regulations {covered ? "(" + covered.join(", ") + ")" : ""}</h3>
          <div className="row" style={{ gap: 8 }}>
            {live?.at && <span className="muted mono" style={{ fontSize: 11 }}>updated {fmtDT(live.at)}</span>}
            <button className="btn" onClick={onRefresh} disabled={live?.status === "loading"}><Radio size={13} /> {live?.status === "loading" ? "Fetching…" : "Refresh"}</button>
          </div>
        </div>
        {live?.status === "loading" && <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>Searching online sources for recent items…</div>}
        {live?.status === "error" && <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>Couldn’t reach the live source. Try Refresh, or use the network-shared items below.</div>}
        {(live?.status === "ok" || liveItems.length > 0) && (
          liveItems.length === 0 ? <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>No live items for this scope yet.</div> :
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", marginTop: 12 }}>
            {liveItems.map(it => (
              <div className="card" key={it.id} style={{ background: "var(--elevated)" }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 7 }}>
                  <span className="tag" style={{ background: TYPE_COLOR[it.type] + "22", color: TYPE_COLOR[it.type] }}>{it.type}</span>
                  <span className="chip" style={{ background: SEV[it.sev].c + "22", color: SEV[it.sev].c }}>{SEV[it.sev].t}</span>
                </div>
                <div style={{ fontSize: 13.5 }}>{it.url ? <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "none" }}>{it.text}</a> : it.text}</div>
                <div className="row muted" style={{ justifyContent: "space-between", marginTop: 9, fontSize: 11 }}><span><Globe size={11} /> {it.jur}</span><span className="mono">{it.source}{it.at ? " · " + it.at : ""}</span></div>
              </div>
            ))}
          </div>
        )}
        {live?.status === "idle" && <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>Click Refresh to pull the latest fraud, sanctions and regulatory news for your corridors and US regulations.</div>}
      </div>

      <h3 style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".6px" }}>Network-shared intelligence</h3>
      {supervisor && <div className="row" style={{ gap: 8, margin: "8px 0 12px", flexWrap: "wrap" }}>{jurs.map(j => <button key={j} className="pill" style={{ borderColor: f === j ? "var(--gold)" : "var(--line)", color: f === j ? "var(--gold)" : "var(--text)" }} onClick={() => setF(j)}>{j}</button>)}</div>}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
        {items.map(it => (
          <div className="card" key={it.id}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 7 }}>
              <span className="tag" style={{ background: TYPE_COLOR[it.type] + "22", color: TYPE_COLOR[it.type] }}>{it.type}</span>
              <span className="chip" style={{ background: SEV[it.sev].c + "22", color: SEV[it.sev].c }}>{SEV[it.sev].t}</span>
            </div>
            <div style={{ fontSize: 13.5 }}>{it.text}</div>
            <div className="row muted" style={{ justifyContent: "space-between", marginTop: 9, fontSize: 11 }}><span><Globe size={11} /> {it.jur}</span><span className="mono">{it.source} · {fmtDate(it.at)}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================================
   Knowledge & training
============================================================================ */
function TrainingCenter({ store, agents }) {
  const rows = agents.map(({ base, slice }) => ({ name: base.name, rate: trainingRate(slice) }));
  return (
    <>
      <h1 className="h1">Knowledge & training center</h1>
      <p className="sub">Central library of AML/CFT, sanctions, FATCA/CRS, typologies and policy material. Completion is tracked and scored — but completion is evidence, not the goal: pair it with the behaviour it should change.</p>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card"><h3>Course catalogue</h3>
          {COURSES.map(c => <div key={c.id} className="row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #e7e9f2" }}><span style={{ fontSize: 13 }}><BookOpen size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{c.title}</span><span className="muted mono" style={{ fontSize: 11 }}>{c.cat} · {c.mins}m</span></div>)}
        </div>
        <div className="card"><h3>Completion by partner</h3>
          {rows.map((r, i) => <div key={i} style={{ margin: "8px 0" }}><div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 13 }}>{r.name}</span><span className="mono muted">{r.rate}%</span></div><div className="bar"><span style={{ width: r.rate + "%", background: r.rate >= 80 ? "var(--green)" : r.rate >= 60 ? "var(--gold)" : "var(--red)" }} /></div></div>)}
        </div>
      </div>
    </>
  );
}
function AgentTraining({ slice, onComplete }) {
  return (
    <>
      <h1 className="h1">Training center</h1>
      <p className="sub">Complete your assigned courses. Your training score feeds your compliance standing — and the topics map to what you actually do on the corridor.</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
        {slice.training.map(c => (
          <div className="card" key={c.id}>
            <div className="row" style={{ justifyContent: "space-between" }}><span style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</span>{c.status === "Completed" ? <span className="chip" style={{ background: "rgba(52,211,153,.15)", color: "var(--green)" }}><Check size={12} /> {c.score}</span> : null}</div>
            <div className="muted" style={{ fontSize: 12, margin: "4px 0 10px" }}>{c.cat} · {c.mins} min</div>
            {c.status === "Completed" ? <button className="btn ghost" disabled>Completed</button> : <button className="btn gold" onClick={() => onComplete(c.id)}><GraduationCap size={13} /> Complete</button>}
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================================
   Due diligence file
============================================================================ */
function DDFile({ slice, base, screening, onScreen, screenLoading }) {
  return (
    <>
      <h1 className="h1">Due diligence file</h1>
      <p className="sub">Your complete compliance file — the partner-as-customer record (CDD + EDD). Searchable, exportable and examination-ready.</p>
      <DDView slice={slice} base={base} supervisor={false} screening={screening} onScreen={onScreen} screenLoading={screenLoading} />
    </>
  );
}

/* ============================================================================
   Communications & collaboration
============================================================================ */
function Comms({ store, agents, supervisor, agentId, onAck, setModal }) {
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div><h1 className="h1">Communications & collaboration</h1>
          <p className="sub">{supervisor ? "Broadcast regulatory updates and see who acknowledged and confirmed they applied them — acknowledgement is evidence, the behaviour confirmation is the point." : "Regulatory notices from Mal. Acknowledge each, and confirm you have applied it — not just read it."}</p></div>
        {supervisor && <button className="btn gold" onClick={() => setModal({ t: "broadcast" })}><Megaphone size={14} /> New broadcast</button>}
      </div>
      <div className="grid" style={{ gap: 11 }}>
        {store.broadcasts.map(b => {
          const acked = !supervisor && store.agents[agentId].acks.find(x => x.id === b.id);
          const ackCount = agents.filter(({ slice }) => slice.acks.find(x => x.id === b.id)).length;
          const appliedCount = agents.filter(({ slice }) => slice.acks.find(x => x.id === b.id && x.applied)).length;
          return (
            <div className="card" key={b.id}>
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span><Megaphone size={14} color="var(--gold)" style={{ verticalAlign: "-2px", marginRight: 7 }} /><b>{b.title}</b> <span className="muted">· {b.jur}</span></span>
                <span className="chip" style={{ background: SEV[b.sev].c + "22", color: SEV[b.sev].c }}>{SEV[b.sev].t}</span>
              </div>
              <div style={{ fontSize: 13.5, margin: "8px 0" }}>{b.body}</div>
              <div className="muted" style={{ fontSize: 12 }}><b style={{ color: "var(--gold2)" }}>Required behaviour:</b> {b.behavior}</div>
              {supervisor ? (
                <div className="row" style={{ gap: 16, marginTop: 10 }}>
                  <span className="muted" style={{ fontSize: 12 }}>Acknowledged {ackCount}/{agents.length}</span>
                  <span className="muted" style={{ fontSize: 12 }}>Confirmed applied {appliedCount}/{agents.length}</span>
                  <div className="bar" style={{ flex: 1, maxWidth: 200 }}><span style={{ width: (appliedCount / agents.length * 100) + "%", background: "var(--green)" }} /></div>
                </div>
              ) : (
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  {acked ? <span className="chip" style={{ background: "rgba(52,211,153,.15)", color: "var(--green)" }}><Check size={12} /> {acked.applied ? "Acknowledged · applied" : "Acknowledged"}</span>
                    : <><button className="btn ghost" onClick={() => onAck(agentId, b.id, false)}>Acknowledge</button><button className="btn gold" onClick={() => onAck(agentId, b.id, true)}><Check size={13} /> Acknowledge & confirm applied</button></>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {supervisor && store.speakup.length > 0 && (
        <div className="card" style={{ marginTop: 13 }}><h3>Speak-up channel</h3>
          {store.speakup.map(s => <div key={s.id} style={{ padding: "7px 0", borderBottom: "1px solid #e7e9f2" }}><div className="row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: 13 }}>{s.topic}</b><span className="muted mono" style={{ fontSize: 11 }}>{s.anon ? "Anonymous" : s.from} · {fmtDate(s.at)}</span></div><div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{s.body}</div></div>)}
        </div>
      )}
    </>
  );
}

/* ============================================================================
   Executive dashboard
============================================================================ */
function Exec({ agents, store }) {
  const scores = agents.map(({ base }) => overall(base));
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const riskDist = ["Low", "Medium", "High", "Critical"].map(t => ({ name: t, value: agents.filter(({ base }) => ratingFor(overall(base)).t === t).length, c: ratingFor(t === "Low" ? 90 : t === "Medium" ? 75 : t === "High" ? 60 : 40).c }));
  const sarStr = agents.map(({ base, slice }) => ({ name: base.name.split(" ")[0], SAR: slice.registers.sar.length, STR: slice.registers.str.length }));
  const reviews = Object.values(store.reviews);
  const reviewDone = reviews.filter(r => r.status === "Closed").length;
  const maturity = Math.round((avg * 0.5) + (agents.reduce((s, { slice }) => s + trainingRate(slice), 0) / agents.length) * 0.3 + (reviewDone / reviews.length * 100) * 0.2);
  return (
    <>
      <h1 className="h1">Executive dashboard</h1>
      <p className="sub">Global partner risk landscape and programme health for management and the Board.</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <Kpi label="Network compliance score" value={avg} accent={ratingFor(avg).c} />
        <Kpi label="High-risk partners" value={agents.filter(({ base }) => ["High", "Critical"].includes(ratingFor(overall(base)).t)).length} accent="var(--red)" />
        <Kpi label="Review completion" value={Math.round(reviewDone / reviews.length * 100) + "%"} />
        <Kpi label="Compliance maturity" value={maturity} sub="score / training / reviews blend" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1.3fr", marginTop: 13 }}>
        <div className="card"><h3>Risk distribution</h3>
          <div style={{ height: 180 }}><ResponsiveContainer><PieChart>
            <Pie data={riskDist.filter(d => d.value)} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={3}>
              {riskDist.filter(d => d.value).map((d, i) => <Cell key={i} fill={d.c} stroke="none" />)}</Pie>
            <Tooltip contentStyle={{ background: "#f5f6fb", border: "1px solid #e4e7ef", borderRadius: 8, color: "#0c0d14" }} /></PieChart></ResponsiveContainer></div>
        </div>
        <div className="card"><h3>SAR / STR by partner</h3>
          <div style={{ height: 180 }}><ResponsiveContainer><BarChart data={sarStr}>
            <XAxis dataKey="name" tick={{ fill: "#5b6472", fontSize: 11 }} /><YAxis tick={{ fill: "#5b6472", fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#f5f6fb", border: "1px solid #e4e7ef", borderRadius: 8, color: "#0c0d14" }} cursor={{ fill: "#ffffff08" }} />
            <Bar dataKey="SAR" fill="#ef4444" radius={[3, 3, 0, 0]} /><Bar dataKey="STR" fill="#8000ff" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 13 }}><h3>High-risk partner alerts</h3>
        {agents.filter(({ base }) => ["High", "Critical"].includes(ratingFor(overall(base)).t)).map(({ base, slice }) => { const ew = earlyWarnings(base, slice, store.reviews); return (
          <div className="row" key={base.id} style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e7e9f2" }}>
            <span><CircleAlert size={14} color="var(--red)" style={{ verticalAlign: "-2px", marginRight: 7 }} /><b>{base.name}</b> <span className="muted">· {base.jur} · score {overall(base)}</span></span>
            <span className="muted" style={{ fontSize: 12 }}>{ew.join(" · ") || "monitor"}</span>
          </div>
        ); })}
      </div>
    </>
  );
}

/* ============================================================================
   Agent standing (gamified, honest)
============================================================================ */
function Standing({ agent, slice, store }) {
  const sc = overall(agent);
  const tier = sc >= 90 ? "Preferred" : sc >= 80 ? "Trusted" : sc >= 65 ? "Standard" : "Provisional";
  const openCrit = Object.values(store.reviews).some(r => r.agent === agent.id && r.findings?.some(f => f.sev === "Critical" && f.status === "Open"));
  const auditReady = !openCrit && trainingRate(slice) >= 80 && ddStatus(slice).done === ddStatus(slice).total;
  const badges = [
    { id: "report", name: "Reporter", desc: "Filed a SAR or STR", on: slice.registers.sar.length + slice.registers.str.length > 0, icon: FileText },
    { id: "train", name: "Trained up", desc: "≥ 80% training complete", on: trainingRate(slice) >= 80, icon: GraduationCap },
    { id: "dd", name: "File complete", desc: "All DD items complete", on: ddStatus(slice).done === ddStatus(slice).total, icon: FolderOpen },
    { id: "ack", name: "Responsive", desc: "Acknowledged a broadcast", on: slice.acks.length > 0, icon: Megaphone },
    { id: "ready", name: "Audit-ready", desc: "Training ≥ 80% · DD complete · no critical findings", on: auditReady, icon: ShieldCheck },
  ];
  return (
    <>
      <h1 className="h1">My compliance standing</h1>
      <p className="sub">Your standing reflects what you do — reporting, training, due-diligence documents and how quickly you resolve issues. The goal is genuine audit-readiness.</p>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="card">
          <h3>Where you stand</h3>
          <ScoreBar label="Training complete" v={trainingRate(slice)} />
          <ScoreBar label="Due-diligence documents provided" v={Math.round(100 * ddStatus(slice).done / Math.max(1, ddStatus(slice).total))} />
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{badges.filter(b => b.on).length} of {badges.length} milestones reached</div>
        </div>
        <div className="card" style={{ gridColumn: "span 2" }}><h3>What moves your standing</h3>
          {[
            ["Keep reporting up to date (SAR/STR, certifications)", slice.registers.sar.length + slice.registers.str.length > 0],
            ["Complete your training", trainingRate(slice) >= 80],
            ["Provide your due-diligence documents", ddStatus(slice).done === ddStatus(slice).total],
            ["Acknowledge and apply regulatory notices", slice.acks.length > 0],
            ["Resolve any open findings promptly", !openCrit],
          ].map(([label, ok], i) => (
            <div key={i} className="row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              {ok ? <span className="chip" style={{ background: "rgba(23,163,74,.14)", color: "var(--green)" }}><Check size={12} /> done</span> : <span className="chip" style={{ background: "#f5f6fb", color: "var(--muted)" }}>to do</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 13, borderColor: auditReady ? "var(--green)" : "var(--line)" }}>
        <div className="row" style={{ gap: 10 }}>
          <ShieldCheck size={22} color={auditReady ? "var(--green)" : "var(--muted)"} />
          <div><b>{auditReady ? "You are audit-ready" : "Path to audit-ready"}</b>
            <div className="muted" style={{ fontSize: 12.5 }}>{auditReady ? "Training complete, due-diligence documents in, and no open critical findings. Keep it there." : "Complete your training, provide your due-diligence documents, and clear any open critical findings."}</div></div>
        </div>
      </div>
      <h3 style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".6px", marginTop: 18 }}>Milestones</h3>
      <div className="badgegrid">
        {badges.map(b => <div key={b.id} className={"badge2" + (b.on ? " on" : "")}><div className="ic">{b.on ? <b.icon size={19} /> : <Lock size={16} color="var(--muted)" />}</div><div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div><div className="muted" style={{ fontSize: 11 }}>{b.desc}</div></div>)}
      </div>
    </>
  );
}

/* ============================================================================
   Audit trail
============================================================================ */
function AuditTrail({ store }) {
  return (
    <>
      <h1 className="h1">Audit trail</h1>
      <p className="sub">Complete record of actions — submissions, approvals, acknowledgements, risk-scoring and review changes, and communications — for regulatory examination.</p>
      <div className="tablewrap"><table>
        <thead><tr><th>When</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th></tr></thead>
        <tbody>{store.audit.map(a => <tr key={a.id}><td className="muted mono" style={{ whiteSpace: "nowrap" }}>{fmtDT(a.at)}</td><td>{a.actor}</td><td><span className="chip" style={{ background: "#f5f6fb" }}>{a.role}</span></td><td style={{ fontWeight: 600 }}>{a.action}</td><td className="muted">{a.target}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}

/* ============================================================================
   Modals
============================================================================ */
function Modal({ title, sub, onClose, children, footer }) {
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
    <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2><button className="btn ghost" onClick={onClose}><X size={16} /></button></div>
    {sub && <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{sub}</p>}
    <div style={{ marginTop: 10 }}>{children}</div>
    {footer && <div className="row" style={{ justifyContent: "flex-end", gap: 10, marginTop: 14 }}>{footer}</div>}
  </div></div>;
}
function ReportModal({ type, onClose, onSubmit }) {
  const [v, setV] = useState({});
  return <Modal title={"Submit " + type.name} sub={type.reg + " · versioned, timestamped, audit-logged"} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={!v.summary} onClick={() => onSubmit(v)}><Send size={14} /> Submit</button></>}>
    <div className="field"><label>Subject / reference</label><input className="input" value={v.subject || ""} onChange={e => setV({ ...v, subject: e.target.value })} /></div>
    <div className="field"><label>Summary (required)</label><textarea value={v.summary || ""} onChange={e => setV({ ...v, summary: e.target.value })} /></div>
    <div className="field"><label>Reporting period</label><input className="input" value={v.period || ""} onChange={e => setV({ ...v, period: e.target.value })} /></div>
  </Modal>;
}
function IntelModal({ onClose, onSubmit }) {
  const [v, setV] = useState({ type: "REG", sev: "med" });
  return <Modal title="Share a regulatory update" sub="Adds to the centralised intelligence library for your jurisdiction" onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={!v.text} onClick={() => onSubmit(v)}><Send size={14} /> Share</button></>}>
    <div className="field"><label>Type</label><select value={v.type} onChange={e => setV({ ...v, type: e.target.value })}>{["REG", "SANCTIONS", "TYPOLOGY", "FRAUD"].map(x => <option key={x}>{x}</option>)}</select></div>
    <div className="field"><label>Severity</label><select value={v.sev} onChange={e => setV({ ...v, sev: e.target.value })}>{["low", "med", "high", "crit"].map(x => <option key={x} value={x}>{SEV[x].t}</option>)}</select></div>
    <div className="field"><label>Update</label><textarea value={v.text || ""} onChange={e => setV({ ...v, text: e.target.value })} /></div>
  </Modal>;
}
function BroadcastModal({ onClose, onSubmit }) {
  const [v, setV] = useState({ sev: "med", jur: "All" });
  return <Modal title="New broadcast" sub="Communicate an obligation and the behaviour it should produce — not just the document" onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={!v.title || !v.behavior} onClick={() => onSubmit(v)}><Megaphone size={14} /> Send</button></>}>
    <div className="field"><label>Title</label><input className="input" value={v.title || ""} onChange={e => setV({ ...v, title: e.target.value })} /></div>
    <div className="field"><label>Message</label><textarea value={v.body || ""} onChange={e => setV({ ...v, body: e.target.value })} /></div>
    <div className="field"><label>Required behaviour (what should change)</label><input className="input" value={v.behavior || ""} onChange={e => setV({ ...v, behavior: e.target.value })} /></div>
    <div className="row" style={{ gap: 10 }}>
      <div className="field" style={{ flex: 1 }}><label>Severity</label><select value={v.sev} onChange={e => setV({ ...v, sev: e.target.value })}>{["low", "med", "high", "crit"].map(x => <option key={x} value={x}>{SEV[x].t}</option>)}</select></div>
      <div className="field" style={{ flex: 1 }}><label>Jurisdiction</label><input className="input" value={v.jur} onChange={e => setV({ ...v, jur: e.target.value })} /></div>
    </div>
  </Modal>;
}
function SpeakupModal({ onClose, onSubmit }) {
  const [v, setV] = useState({ anon: "N" });
  return <Modal title="Speak-up channel" sub="Raise a compliance concern. A safe, documented path — not a surveillance tool." onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={!v.topic || !v.body} onClick={() => onSubmit(v)}><Send size={14} /> Submit</button></>}>
    <div className="field"><label>Topic</label><input className="input" value={v.topic || ""} onChange={e => setV({ ...v, topic: e.target.value })} /></div>
    <div className="field"><label>Detail</label><textarea value={v.body || ""} onChange={e => setV({ ...v, body: e.target.value })} /></div>
    <div className="field"><label>Submit anonymously?</label><select value={v.anon} onChange={e => setV({ ...v, anon: e.target.value })}><option value="N">No</option><option value="Y">Yes</option></select></div>
  </Modal>;
}
function FindingModal({ review, onClose, onSave }) {
  const [v, setV] = useState({ sev: "Medium", status: "Open" });
  const ref = "F-" + ((review.findings?.length || 0) + 1);
  return <Modal title={"Add finding · " + ref} sub="Attribute each finding to a fact and a specific standard" onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={!v.desc || !v.standard} onClick={() => onSave({ ref, ...v })}><Plus size={14} /> Log finding</button></>}>
    <div className="field"><label>Finding</label><textarea value={v.desc || ""} onChange={e => setV({ ...v, desc: e.target.value })} /></div>
    <div className="field"><label>Standard / regulation breached</label><input className="input" value={v.standard || ""} onChange={e => setV({ ...v, standard: e.target.value })} /></div>
    <div className="field"><label>Severity</label><select value={v.sev} onChange={e => setV({ ...v, sev: e.target.value })}>{["Critical", "High", "Medium", "Low"].map(x => <option key={x}>{x}</option>)}</select></div>
  </Modal>;
}

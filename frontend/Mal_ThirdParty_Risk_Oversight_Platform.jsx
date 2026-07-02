import { useCallback, useEffect, useMemo, useState } from "react";
import seedControls from "../spec/controls.json";
import seedCases from "../spec/cases.json";
import seedRegChanges from "../spec/reg-changes.json";

/*
 * Third-Party Risk & Oversight Platform — single-file app.
 *
 * Data access was previously backed by `window.storage` (localStorage). It now
 * reads/writes through the REST API at http://localhost:3001/api and falls back
 * to the seeded JSON spec (persisted in window.localStorage) whenever the API
 * is unavailable, so the app keeps working offline.
 */

const API_BASE = "http://localhost:3001/api";

const SEED = {
  controls: seedControls,
  cases: seedCases,
  "reg-changes": seedRegChanges,
};

// ---------------------------------------------------------------------------
// Offline fallback store (formerly the direct `window.storage` target).
// Seeded from the JSON spec on first use.
// ---------------------------------------------------------------------------
const storage = {
  read(resource) {
    try {
      const raw = window.localStorage.getItem(`tprm:${resource}`);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return SEED[resource] ?? [];
  },
  write(resource, items) {
    try {
      window.localStorage.setItem(`tprm:${resource}`, JSON.stringify(items));
    } catch {
      /* ignore */
    }
    return items;
  },
};

async function apiFetch(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

// READ — try API, fall back to seeded offline data.
async function listResource(resource) {
  try {
    const data = await apiFetch(`/${resource}`);
    storage.write(resource, data); // keep the offline cache warm
    return { data, online: true };
  } catch {
    return { data: storage.read(resource), online: false };
  }
}

// CREATE — try API, otherwise mutate the offline store.
async function createResource(resource, item) {
  try {
    const created = await apiFetch(`/${resource}`, {
      method: "POST",
      body: JSON.stringify(item),
    });
    return { item: created, online: true };
  } catch {
    const items = storage.read(resource);
    const created = { ...item, id: item.id || `${resource}-${Date.now()}` };
    storage.write(resource, [...items, created]);
    return { item: created, online: false };
  }
}

// UPDATE — try API, otherwise mutate the offline store.
async function updateResource(resource, id, patch) {
  try {
    const updated = await apiFetch(`/${resource}/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    return { item: updated, online: true };
  } catch {
    const items = storage
      .read(resource)
      .map((x) => (x.id === id ? { ...x, ...patch } : x));
    storage.write(resource, items);
    return { item: items.find((x) => x.id === id), online: false };
  }
}

// DELETE — try API, otherwise mutate the offline store.
async function deleteResource(resource, id) {
  try {
    await apiFetch(`/${resource}/${id}`, { method: "DELETE" });
    return { online: true };
  } catch {
    storage.write(
      resource,
      storage.read(resource).filter((x) => x.id !== id),
    );
    return { online: false };
  }
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------
const TIER = { Critical: "tier-Critical", High: "tier-High", Medium: "tier-Medium", Low: "tier-Low" };

const CONTROL_STATUS = {
  Implemented: "s-green",
  "Partially Implemented": "s-blue",
  "Not Implemented": "s-red",
  "Not Applicable": "s-gray",
};
const EFFECTIVENESS = {
  Effective: "s-green",
  "Needs Improvement": "s-blue",
  Ineffective: "s-red",
  "Not Tested": "s-gray",
};
const CASE_STATUS = {
  Open: "s-red",
  "In Progress": "s-blue",
  "Pending Review": "s-violet",
  Closed: "s-green",
};
const REG_STATUS = {
  Horizon: "s-gray",
  Assessing: "s-blue",
  "Impact Identified": "s-violet",
  Implementing: "s-blue",
  Complete: "s-green",
};

const CASE_STATUS_OPTIONS = ["Open", "In Progress", "Pending Review", "Closed"];

function Badge({ value, map }) {
  return <span className={`badge ${map[value] ?? "s-gray"}`}>{value}</span>;
}
function Tier({ value }) {
  return <span className={`badge ${TIER[value] ?? "s-gray"}`}>{value}</span>;
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Generic hook that loads a resource and tracks API connectivity.
function useResource(resource) {
  const [data, setData] = useState(() => storage.read(resource));
  const [online, setOnline] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await listResource(resource);
    setData(res.data);
    setOnline(res.online);
    setLoading(false);
  }, [resource]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, online, setOnline, loading, reload };
}

// ---------------------------------------------------------------------------
// Reusable add form
// ---------------------------------------------------------------------------
function AddForm({ fields, onCreate }) {
  const empty = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.name, f.default ?? ""])),
    [fields],
  );
  const [values, setValues] = useState(empty);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!values[fields[0].name]) return;
    setBusy(true);
    await onCreate(values);
    setValues(empty);
    setBusy(false);
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <div className="form-grid">
        {fields.map((f) => (
          <label key={f.name}>
            <span>{f.label}</span>
            {f.options ? (
              <select
                className="input"
                value={values[f.name]}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              >
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type={f.type ?? "text"}
                value={values[f.name]}
                placeholder={f.placeholder}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Add"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
function Overview({ controls, cases, regChanges }) {
  const implemented = controls.filter((c) => c.status === "Implemented").length;
  const ineffective = controls.filter((c) => c.effectiveness === "Ineffective").length;
  const openCases = cases.filter((c) => c.status !== "Closed").length;
  const seriousCases = cases.filter(
    (c) => c.status !== "Closed" && (c.severity === "High" || c.severity === "Critical"),
  ).length;
  const inFlight = regChanges.filter((r) => r.status !== "Complete").length;
  const highImpact = regChanges.filter((r) => r.impact === "High").length;
  const coverage = controls.length
    ? Math.round((implemented / controls.length) * 100)
    : 0;

  const stats = [
    { label: "Control coverage", value: `${coverage}%`, hint: `${implemented}/${controls.length} implemented`, tone: coverage >= 70 ? "success" : "warning", icon: "✔" },
    { label: "Ineffective controls", value: ineffective, hint: "require remediation", tone: ineffective > 0 ? "danger" : "success", icon: "▤" },
    { label: "Open cases", value: openCases, hint: `${seriousCases} high or critical`, tone: seriousCases > 0 ? "danger" : "default", icon: "⚠" },
    { label: "Reg changes in flight", value: inFlight, hint: `${highImpact} high impact`, tone: highImpact > 0 ? "warning" : "default", icon: "§" },
  ];

  return (
    <div className="grid cols-4">
      {stats.map((s) => (
        <div className="card stat" key={s.label}>
          <div className="stat-top">
            <span className="stat-label">{s.label}</span>
            <span className={`stat-icon ${s.tone}`} aria-hidden>
              {s.icon}
            </span>
          </div>
          <p className="stat-value">{s.value}</p>
          <p className="stat-hint">{s.hint}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resource sections
// ---------------------------------------------------------------------------
function ControlsView({ res, onStatus }) {
  const { data, setData, reload } = res;

  async function add(values) {
    const { item } = await createResource("controls", values);
    setData((d) => [...d, item]);
    onStatus();
  }
  async function remove(id) {
    await deleteResource("controls", id);
    setData((d) => d.filter((x) => x.id !== id));
    onStatus();
  }

  return (
    <section className="stack">
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Control</th>
              <th>Domain</th>
              <th>Framework</th>
              <th>Status</th>
              <th>Effectiveness</th>
              <th>Next test</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="cell-strong">{c.name}</div>
                  <div className="cell-sub">{c.owner}</div>
                </td>
                <td className="muted">{c.domain}</td>
                <td className="muted">{c.framework}</td>
                <td><Badge value={c.status} map={CONTROL_STATUS} /></td>
                <td><Badge value={c.effectiveness} map={EFFECTIVENESS} /></td>
                <td className="muted">{fmtDate(c.nextTest)}</td>
                <td>
                  <button className="danger-link" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 ? (
              <tr><td colSpan={7} className="empty">No controls yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card pad">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Add control</h3>
        <AddForm
          onCreate={add}
          fields={[
            { name: "name", label: "Name", placeholder: "Control name" },
            { name: "domain", label: "Domain", default: "Vendor Management", options: ["Vendor Management", "Data Protection", "Access Management", "Resilience", "Privacy"] },
            { name: "framework", label: "Framework", default: "SOC 2", options: ["SOC 2", "ISO 27001", "NIST CSF", "ISO 22301", "GDPR"] },
            { name: "owner", label: "Owner", placeholder: "Team / person" },
            { name: "status", label: "Status", default: "Implemented", options: ["Implemented", "Partially Implemented", "Not Implemented", "Not Applicable"] },
            { name: "effectiveness", label: "Effectiveness", default: "Not Tested", options: ["Effective", "Needs Improvement", "Ineffective", "Not Tested"] },
            { name: "nextTest", label: "Next test", type: "date" },
          ]}
        />
      </div>
      <RefreshBar onReload={reload} />
    </section>
  );
}

function CasesView({ res, onStatus }) {
  const { data, setData, reload } = res;

  async function add(values) {
    const { item } = await createResource("cases", {
      ...values,
      openedDate: new Date().toISOString().slice(0, 10),
    });
    setData((d) => [...d, item]);
    onStatus();
  }
  async function changeStatus(id, status) {
    const { item } = await updateResource("cases", id, { status });
    setData((d) => d.map((x) => (x.id === id ? item ?? { ...x, status } : x)));
    onStatus();
  }
  async function remove(id) {
    await deleteResource("cases", id);
    setData((d) => d.filter((x) => x.id !== id));
    onStatus();
  }

  return (
    <section className="stack">
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Third party</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="cell-strong">{c.title}</div>
                  <div className="cell-sub">{c.summary}</div>
                </td>
                <td className="muted">{c.thirdParty}</td>
                <td className="muted">{c.type}</td>
                <td><Tier value={c.severity} /></td>
                <td>
                  <select
                    className="input mini"
                    value={c.status}
                    onChange={(e) => changeStatus(c.id, e.target.value)}
                  >
                    {CASE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="muted">{fmtDate(c.dueDate)}</td>
                <td>
                  <button className="danger-link" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 ? (
              <tr><td colSpan={7} className="empty">No cases yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card pad">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Open a case</h3>
        <AddForm
          onCreate={add}
          fields={[
            { name: "title", label: "Title", placeholder: "Case title" },
            { name: "thirdParty", label: "Third party", placeholder: "Vendor name" },
            { name: "type", label: "Type", default: "Issue", options: ["Incident", "Issue", "Investigation", "Exception", "Due Diligence"] },
            { name: "severity", label: "Severity", default: "Medium", options: ["Critical", "High", "Medium", "Low"] },
            { name: "status", label: "Status", default: "Open", options: CASE_STATUS_OPTIONS },
            { name: "owner", label: "Owner", placeholder: "Owner" },
            { name: "dueDate", label: "Due date", type: "date" },
          ]}
        />
      </div>
      <RefreshBar onReload={reload} />
    </section>
  );
}

function RegChangesView({ res, onStatus }) {
  const { data, setData, reload } = res;

  async function add(values) {
    const { item } = await createResource("reg-changes", {
      ...values,
      affectedThirdParties: Number(values.affectedThirdParties) || 0,
    });
    setData((d) => [...d, item]);
    onStatus();
  }
  async function remove(id) {
    await deleteResource("reg-changes", id);
    setData((d) => d.filter((x) => x.id !== id));
    onStatus();
  }

  return (
    <section className="stack">
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Regulatory change</th>
              <th>Regulator</th>
              <th>Jurisdiction</th>
              <th>Status</th>
              <th>Impact</th>
              <th>Effective</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="cell-strong">{r.title}</div>
                  <div className="cell-sub">{r.summary}</div>
                </td>
                <td className="muted">{r.regulator}</td>
                <td className="muted">{r.jurisdiction}</td>
                <td><Badge value={r.status} map={REG_STATUS} /></td>
                <td><Tier value={r.impact} /></td>
                <td className="muted">{fmtDate(r.effectiveDate)}</td>
                <td>
                  <button className="danger-link" onClick={() => remove(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 ? (
              <tr><td colSpan={7} className="empty">No regulatory changes tracked.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card pad">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Track a regulatory change</h3>
        <AddForm
          onCreate={add}
          fields={[
            { name: "title", label: "Title", placeholder: "Regulation / change" },
            { name: "regulator", label: "Regulator", placeholder: "e.g. EBA, FCA" },
            { name: "jurisdiction", label: "Jurisdiction", placeholder: "e.g. European Union" },
            { name: "status", label: "Status", default: "Horizon", options: ["Horizon", "Assessing", "Impact Identified", "Implementing", "Complete"] },
            { name: "impact", label: "Impact", default: "Medium", options: ["High", "Medium", "Low"] },
            { name: "effectiveDate", label: "Effective date", type: "date" },
            { name: "owner", label: "Owner", placeholder: "Owner" },
            { name: "affectedThirdParties", label: "# affected", type: "number" },
          ]}
        />
      </div>
      <RefreshBar onReload={reload} />
    </section>
  );
}

function RefreshBar({ onReload }) {
  return (
    <div className="muted" style={{ display: "flex", justifyContent: "flex-end" }}>
      <button className="btn ghost" onClick={onReload}>
        Refresh from API
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "controls", label: "Controls" },
  { id: "cases", label: "Cases" },
  { id: "reg-changes", label: "Regulatory Changes" },
];

export default function Mal_ThirdParty_Risk_Oversight_Platform() {
  const [tab, setTab] = useState("overview");
  const controls = useResource("controls");
  const cases = useResource("cases");
  const regChanges = useResource("reg-changes");

  // Connectivity = online if any resource fetched from the API successfully.
  const online = [controls.online, cases.online, regChanges.online].some(
    (x) => x === true,
  );
  const resolved =
    controls.online !== null && cases.online !== null && regChanges.online !== null;

  function reloadAll() {
    controls.reload();
    cases.reload();
    regChanges.reload();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">◇</span>
          <div>
            <div className="brand-title">Third-Party Risk &amp; Oversight</div>
            <div className="brand-sub">Controls · Cases · Regulatory Change</div>
          </div>
        </div>
        <span
          className={`conn ${resolved ? (online ? "online" : "offline") : "pending"}`}
          title={`API: ${API_BASE}`}
        >
          <span className="conn-dot" />
          {!resolved
            ? "Connecting…"
            : online
              ? "Online · API"
              : "Offline · seeded data"}
        </span>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === "overview" ? (
          <Overview
            controls={controls.data}
            cases={cases.data}
            regChanges={regChanges.data}
          />
        ) : null}
        {tab === "controls" ? (
          <ControlsView res={controls} onStatus={reloadAll} />
        ) : null}
        {tab === "cases" ? <CasesView res={cases} onStatus={reloadAll} /> : null}
        {tab === "reg-changes" ? (
          <RegChangesView res={regChanges} onStatus={reloadAll} />
        ) : null}
      </main>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Briefcase,
  ChevronRight,
  LogIn,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  collaborators,
  directReports,
  expertise,
  monthLabel,
  org,
  teamHistory,
  tenureLabel,
  timeline,
  type Employee,
  type TimelineKind,
} from "@/lib/org";

/*
 * Progressive disclosure: the first view is only the structure (CEO and
 * departments). A department opens its teams, a team opens its people, and a
 * person or project opens a drawer with tabs for the extra context.
 */

type DrawerItem = { kind: "person" | "project"; id: string };

const departments = org.departments.filter((d) => d.id !== "directie");
const ceo = org.employee(org.executive.managerId);
const headcount = (departmentId: string) =>
  org.employees.filter((e) => e.departmentId === departmentId).length;
const hueOf = (employee: Employee) => org.department(employee.departmentId).hue;

export function Organogram() {
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerItem[]>([]);
  const current = drawer.at(-1) ?? null;

  const openPerson = (id: string) =>
    setDrawer((stack) => [...stack, { kind: "person", id }]);
  const openProject = (id: string) =>
    setDrawer((stack) => [...stack, { kind: "project", id }]);

  /* Reveal a person in the tree: open their department and team. */
  const reveal = (employee: Employee) => {
    if (employee.departmentId !== "directie") {
      setDepartmentId(employee.departmentId);
      setTeamId(employee.teamId === "directie" ? null : employee.teamId);
    }
    setDrawer([{ kind: "person", id: employee.id }]);
  };

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  const selectedId = current?.kind === "person" ? current.id : null;
  const department = departmentId ? org.department(departmentId) : null;
  const team = teamId ? org.team(teamId) : null;
  const column = department ? departments.indexOf(department) : -1;

  return (
    <div className="page org-page">
      <div className="org-heading">
        <div>
          <h1>Organogram</h1>
          <p>Klik op een afdeling, team of persoon voor meer context.</p>
        </div>
        <PersonSearch onPick={reveal} />
      </div>

      <div className="org-tree">
        <div className="org-ceo">
          <PersonNode
            employee={ceo}
            selected={selectedId === ceo.id}
            onSelect={openPerson}
          />
        </div>
        <div className="org-stem" aria-hidden="true" />
        <div className="org-rail-scroll">
          <div className="org-departments">
            {departments.map((d) => {
              const open = d.id === departmentId;
              return (
                <button
                  key={d.id}
                  className={`org-department hue-${d.hue}${open ? " is-open" : ""}`}
                  aria-expanded={open}
                  onClick={() => {
                    setDepartmentId(open ? null : d.id);
                    setTeamId(null);
                  }}
                >
                  <strong>{d.name}</strong>
                  <small>{org.employee(d.directorId).name}</small>
                  <span className="org-count">
                    <Users size={13} /> {headcount(d.id)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {department && (
          <section
            className={`org-level hue-${department.hue}`}
            style={{ "--col": column } as React.CSSProperties}
            aria-label={department.name}
          >
            <div className="org-level-head">
              <div>
                <h2>{department.name}</h2>
                <p>{department.mission}</p>
              </div>
              <button
                className="org-director"
                onClick={() => openPerson(department.directorId)}
              >
                <Avatar employee={org.employee(department.directorId)} />
                <span>
                  <strong>{org.employee(department.directorId).name}</strong>
                  <small>{org.employee(department.directorId).title}</small>
                </span>
              </button>
            </div>
            <div className="org-teams">
              {department.teamIds.map((id) => {
                const t = org.team(id);
                const open = id === teamId;
                return (
                  <button
                    key={id}
                    className={open ? "org-team is-open" : "org-team"}
                    aria-expanded={open}
                    onClick={() => setTeamId(open ? null : id)}
                  >
                    <strong>{t.name}</strong>
                    <small>{org.employee(t.managerId).name}</small>
                    <span className="org-count">
                      <Users size={13} /> {t.memberIds.length + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {team && (
              <div className="org-people">
                <h3>{team.name}</h3>
                <div className="org-people-lead">
                  <PersonNode
                    employee={org.employee(team.managerId)}
                    selected={selectedId === team.managerId}
                    onSelect={openPerson}
                  />
                </div>
                <div className="org-people-grid">
                  {team.memberIds.map((id) => (
                    <PersonNode
                      key={id}
                      employee={org.employee(id)}
                      selected={selectedId === id}
                      onSelect={openPerson}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <p className="org-footnote">
        Fictieve demodata · 200 medewerkers. In productie gevoed door Entra ID,
        HR en projecttools.
      </p>

      <aside
        className={current ? "org-drawer open" : "org-drawer"}
        aria-label="Details"
        aria-hidden={!current}
      >
        {current && (
          <div className="org-drawer-bar">
            {drawer.length > 1 ? (
              <button
                className="icon-button"
                aria-label="Terug"
                onClick={() => setDrawer((stack) => stack.slice(0, -1))}
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <span />
            )}
            <button
              className="icon-button"
              aria-label="Sluiten"
              onClick={() => setDrawer([])}
            >
              <X size={20} />
            </button>
          </div>
        )}
        {current?.kind === "person" && (
          <PersonDetail
            key={current.id}
            employee={org.employee(current.id)}
            onPerson={openPerson}
            onProject={openProject}
            onShowTeam={reveal}
          />
        )}
        {current?.kind === "project" && (
          <ProjectDetail
            key={current.id}
            id={current.id}
            onPerson={openPerson}
          />
        )}
      </aside>
    </div>
  );
}

function Avatar({
  employee,
  size = "md",
}: {
  employee: Employee;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`org-avatar org-avatar-${size} hue-${hueOf(employee)}`}
      aria-hidden="true"
    >
      {employee.initials}
    </span>
  );
}

function PersonNode({
  employee,
  selected,
  detail,
  onSelect,
}: {
  employee: Employee;
  selected?: boolean;
  detail?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={selected ? "org-person is-selected" : "org-person"}
      aria-pressed={selected}
      onClick={() => onSelect(employee.id)}
    >
      <Avatar employee={employee} />
      <span>
        <strong>{employee.name}</strong>
        <small>{detail ?? employee.title}</small>
      </span>
    </button>
  );
}

function PersonSearch({ onPick }: { onPick: (employee: Employee) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return org.employees
      .filter((e) => {
        const text =
          `${e.name} ${e.title} ${org.team(e.teamId).name}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .slice(0, 8);
  }, [query]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const pick = (employee: Employee) => {
    onPick(employee);
    setQuery("");
    setOpen(false);
  };
  return (
    <div className="org-search" ref={box}>
      <label className="search-field">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) pick(results[0]);
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Zoek een collega"
          aria-label="Zoek een collega"
        />
      </label>
      {open && query && (
        <div className="org-search-results">
          {results.length ? (
            results.map((e) => (
              <button key={e.id} onClick={() => pick(e)}>
                <Avatar employee={e} size="sm" />
                <span>
                  <strong>{e.name}</strong>
                  <small>{e.title}</small>
                </span>
              </button>
            ))
          ) : (
            <p>Geen collega gevonden.</p>
          )}
        </div>
      )}
    </div>
  );
}

type Tab = "overzicht" | "projecten" | "loopbaan" | "netwerk";
const tabs: { id: Tab; label: string }[] = [
  { id: "overzicht", label: "Overzicht" },
  { id: "projecten", label: "Projecten" },
  { id: "loopbaan", label: "Loopbaan" },
  { id: "netwerk", label: "Netwerk" },
];

function PersonDetail({
  employee,
  onPerson,
  onProject,
  onShowTeam,
}: {
  employee: Employee;
  onPerson: (id: string) => void;
  onProject: (id: string) => void;
  onShowTeam: (employee: Employee) => void;
}) {
  const [tab, setTab] = useState<Tab>("overzicht");
  const team = org.team(employee.teamId);
  const department = org.department(employee.departmentId);
  const manager = employee.managerId ? org.employee(employee.managerId) : null;
  const active = employee.projects.filter((p) => !p.to);
  const finished = employee.projects.filter((p) => p.to);
  const reports = directReports(employee);

  return (
    <div className="org-detail">
      <div className="org-detail-head">
        <Avatar employee={employee} size="lg" />
        <div>
          <h2>{employee.name}</h2>
          <p>{employee.title}</p>
          <small>
            {team.id === "directie"
              ? department.name
              : `${team.name} · ${department.name}`}
          </small>
        </div>
      </div>

      <div className="tabs org-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "tab selected" : "tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overzicht" && (
        <div className="org-tab">
          <dl className="org-facts">
            <div>
              <dt>In dienst</dt>
              <dd>{tenureLabel(employee.startDate)}</dd>
              <small>sinds {monthLabel(employee.startDate)}</small>
            </div>
            <div>
              <dt>Locatie</dt>
              <dd>{employee.location}</dd>
            </div>
          </dl>
          {manager && (
            <Field label="Leidinggevende">
              <PersonNode employee={manager} onSelect={onPerson} />
            </Field>
          )}
          {active.length > 0 && (
            <Field label="Werkt nu aan">
              {active.map((a) => (
                <LinkRow
                  key={a.projectId}
                  title={org.project(a.projectId).name}
                  detail={a.role}
                  onClick={() => onProject(a.projectId)}
                />
              ))}
            </Field>
          )}
          {reports.length > 0 && (
            <Field label="Leidt">
              <p className="org-muted">
                {reports.length} {reports.length === 1 ? "persoon" : "mensen"}
              </p>
            </Field>
          )}
          {team.id !== "directie" && (
            <button
              className="text-button"
              onClick={() => onShowTeam(employee)}
            >
              Toon team in organogram <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {tab === "projecten" && (
        <div className="org-tab">
          <Field label="Actief">
            {active.length ? (
              active.map((a) => (
                <LinkRow
                  key={a.projectId}
                  title={org.project(a.projectId).name}
                  detail={`${a.role} · sinds ${monthLabel(a.from)}`}
                  onClick={() => onProject(a.projectId)}
                />
              ))
            ) : (
              <p className="org-muted">Geen lopend project.</p>
            )}
          </Field>
          {finished.length > 0 && (
            <Field label="Afgerond">
              {finished.map((a) => (
                <LinkRow
                  key={a.projectId}
                  title={org.project(a.projectId).name}
                  detail={`${a.role} · ${monthLabel(a.from)} – ${monthLabel(a.to!)}`}
                  onClick={() => onProject(a.projectId)}
                />
              ))}
            </Field>
          )}
        </div>
      )}

      {tab === "loopbaan" && <Career employee={employee} />}

      {tab === "netwerk" && <Network employee={employee} onPerson={onPerson} />}
    </div>
  );
}

const eventIcon: Record<TimelineKind, React.ReactNode> = {
  join: <LogIn size={14} />,
  role: <TrendingUp size={14} />,
  team: <ArrowRightLeft size={14} />,
  project: <Briefcase size={14} />,
};

function Career({ employee }: { employee: Employee }) {
  const stints = teamHistory(employee).reverse();
  return (
    <div className="org-tab">
      <Field label="Teams">
        {stints.map((s) => (
          <div key={`${s.teamId}-${s.from}`} className="org-row">
            <span>
              <strong>{org.team(s.teamId).name}</strong>
              <small>
                {monthLabel(s.from)} – {s.to ? monthLabel(s.to) : "nu"}
              </small>
            </span>
          </div>
        ))}
      </Field>
      <Field label="Tijdlijn">
        <ol className="org-timeline">
          {timeline(employee).map((e, i) => (
            <li key={i} className={`org-event-${e.kind}`}>
              <span className="org-event-icon" aria-hidden="true">
                {eventIcon[e.kind]}
              </span>
              <div>
                <time>{monthLabel(e.date)}</time>
                <strong>{e.title}</strong>
                <small>{e.detail}</small>
              </div>
            </li>
          ))}
        </ol>
      </Field>
    </div>
  );
}

function Network({
  employee,
  onPerson,
}: {
  employee: Employee;
  onPerson: (id: string) => void;
}) {
  const people = collaborators(employee, 5);
  const skills = expertise(employee, 5);
  return (
    <div className="org-tab">
      <Field label="Werkt vaak samen met">
        {people.length ? (
          people.map((c) => (
            <PersonNode
              key={c.employee.id}
              employee={c.employee}
              detail={`${c.sharedProjects.length} gedeeld${c.sharedProjects.length === 1 ? " project" : "e projecten"}`}
              onSelect={onPerson}
            />
          ))
        ) : (
          <p className="org-muted">Nog geen gedeelde projecten.</p>
        )}
      </Field>
      <Field label="Expertise">
        <div className="org-skills">
          {skills.map((s) => (
            <span key={s.tag}>{s.tag}</span>
          ))}
        </div>
        <p className="org-muted org-small">Afgeleid uit teams en projecten.</p>
      </Field>
    </div>
  );
}

function ProjectDetail({
  id,
  onPerson,
}: {
  id: string;
  onPerson: (id: string) => void;
}) {
  const project = org.project(id);
  const members = project.members
    .filter((m) => (project.end ? true : !m.to))
    .sort(
      (a, b) =>
        Number(b.employeeId === project.leadId) -
        Number(a.employeeId === project.leadId),
    );
  return (
    <div className="org-detail">
      <div className="org-detail-head">
        <span className="org-project-icon" aria-hidden="true">
          <Briefcase size={20} />
        </span>
        <div>
          <h2>{project.name}</h2>
          <p>{project.summary}</p>
          <small>
            {project.client} · {monthLabel(project.start)} –{" "}
            {project.end ? monthLabel(project.end) : "nu"}
          </small>
        </div>
      </div>
      <div className="org-tab">
        <Field label={`Team (${members.length})`}>
          {members.map((m) => (
            <PersonNode
              key={m.employeeId}
              employee={org.employee(m.employeeId)}
              detail={m.role}
              onSelect={onPerson}
            />
          ))}
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="org-field">
      <h3>{label}</h3>
      {children}
    </section>
  );
}

function LinkRow({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className="org-row org-row-link" onClick={onClick}>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={16} />
    </button>
  );
}

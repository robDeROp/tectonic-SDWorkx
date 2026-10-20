"use client";
import { ArrowUpRight, Moon } from "lucide-react";
import { dateLabel } from "@/lib/client";
import type { GraphItem, GraphPerson } from "@/lib/types";
import {
  AUTH_REL,
  COL,
  GROUP_LABEL,
  GROUP_ORDER,
  cap,
  egoTotal,
  fmtDate,
  kindLabel,
  signalsFor,
  type Ego,
  type EgoNode,
  type Go,
  type Model,
  type Signal,
} from "./model";
import { Dot, FreshPill, Mini, Tile } from "./bits";

/** Where the details panel is shown, so it only offers jumps that make sense there. */
export type DetailsPlace = "graph" | "map" | "org";

export function SignalList({
  list,
  onGo,
}: {
  list: Signal[];
  onGo: (g: Go) => void;
}) {
  if (!list.length) return null;
  return (
    <div className="kg-signals">
      {list.map((x, i) =>
        x.go ? (
          <button
            key={i}
            type="button"
            className={`kg-signal kg-${x.tone}`}
            onClick={() => onGo(x.go!)}
          >
            {x.text}
          </button>
        ) : (
          <div key={i} className={`kg-signal kg-${x.tone}`}>
            {x.text}
          </div>
        ),
      )}
    </div>
  );
}

export const goFor = (n: EgoNode): Go =>
  n.kind === "unit"
    ? { to: "org", kind: "unit", id: n.id }
    : {
        to: "graph",
        focus: { kind: n.kind === "person" ? "person" : "item", id: n.id },
      };

export function Connections({
  ego,
  onGo,
  hover,
  onHover,
}: {
  ego: Ego;
  onGo: (g: Go) => void;
  hover?: string | null;
  onHover?: (key: string | null) => void;
}) {
  return (
    <>
      <h3>
        Verbonden met <span className="kg-count">{egoTotal(ego)}</span>
      </h3>
      {!ego.ring.length && <p>Nog geen verbanden gevonden.</p>}
      {GROUP_ORDER.map((g) => {
        const list = ego.ring.filter((n) => n.group === g);
        if (!list.length) return null;
        return (
          <div key={g}>
            <div className="kg-conn-title">
              <Dot color={COL[g].c} />
              {GROUP_LABEL[g]}
            </div>
            <div className="kg-rows">
              {list.map((n) => (
                <button
                  key={n.key}
                  type="button"
                  className={`kg-row${hover === n.key ? " kg-hi" : ""}`}
                  onClick={() => onGo(goFor(n))}
                  onMouseEnter={() => onHover?.(n.key)}
                  onMouseLeave={() => onHover?.(null)}
                  onFocus={() => onHover?.(n.key)}
                  onBlur={() => onHover?.(null)}
                >
                  <Mini kind={n.kind} initials={n.initials} />
                  <span className="kg-main">
                    <span className="kg-name">{n.label}</span>
                    <span className="kg-sub">
                      {n.rel}
                      {n.sub ? ` · ${n.sub}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {ego.over[g] ? (
              <div className="kg-more">+ {ego.over[g]} meer</div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function PersonLink({
  model,
  id,
  onGo,
  place,
}: {
  model: Model;
  id: string;
  onGo: (g: Go) => void;
  place: DetailsPlace;
}) {
  const p = model.person(id);
  if (!p) return null;
  return (
    <button
      type="button"
      className="kg-linkish"
      onClick={() =>
        onGo(
          place === "org"
            ? { to: "org", kind: "person", id }
            : { to: "graph", focus: { kind: "person", id } },
        )
      }
    >
      {p.name}
    </button>
  );
}

export function ItemDetails({
  model,
  it,
  onGo,
  place,
  stats,
}: {
  model: Model;
  it: GraphItem;
  onGo: (g: Go) => void;
  place: DetailsPlace;
  stats?: React.ReactNode;
}) {
  const a = it.authorId ? model.person(it.authorId) : undefined;
  const t = model.topic(it.topic);
  return (
    <>
      <div className="kg-insp-head">
        <Tile kind={it.type} />
        <div>
          <div className="kg-eyebrow">
            {kindLabel(it)} · {it.source}
          </div>
          <h2>{it.title}</h2>
          <div className="kg-pills">
            <FreshPill fresh={it.fresh} />
            {it.status && <span className="kg-pill kg-plain">{it.status}</span>}
          </div>
        </div>
      </div>
      <dl className="kg-meta">
        <dt>{cap(AUTH_REL[it.type])}</dt>
        <dd>
          {a ? (
            <PersonLink model={model} id={a.id} onGo={onGo} place={place} />
          ) : (
            it.authorLabel
          )}
        </dd>
        {a && (
          <>
            <dt>Team</dt>
            <dd>
              <button
                type="button"
                className="kg-linkish"
                onClick={() => onGo({ to: "org", kind: "unit", id: a.unitId })}
              >
                {model.teamLabel(a)}
              </button>
            </dd>
          </>
        )}
        <dt>Locatie</dt>
        <dd>{it.location}</dd>
        <dt>{it.type === "doc" ? "Bijgewerkt" : "Laatste activiteit"}</dt>
        <dd>{fmtDate(it.date)}</dd>
        {t && (
          <>
            <dt>Onderwerp</dt>
            <dd>
              <button
                type="button"
                className="kg-linkish"
                onClick={() => onGo({ to: "topic", id: t.id })}
              >
                {t.name}
              </button>
            </dd>
          </>
        )}
      </dl>
      {stats}
      <p className="kg-summary">{it.summary}</p>
      <SignalList list={signalsFor(model, it)} onGo={onGo} />
      <div className="kg-btn-row">
        {place === "map" ? (
          <button
            type="button"
            className="kg-btn kg-primary"
            onClick={() =>
              onGo({ to: "graph", focus: { kind: "item", id: it.id } })
            }
          >
            Toon alle verbanden
          </button>
        ) : (
          <button
            type="button"
            className="kg-btn"
            onClick={() => onGo({ to: "map", id: it.id })}
          >
            Toon in de kennisbank
          </button>
        )}
        {it.href && (
          <button
            type="button"
            className="kg-btn"
            onClick={() => onGo({ to: "href", href: it.href! })}
          >
            Open {it.type === "hunch" ? "hunch" : "klantvraag"}{" "}
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </>
  );
}

export function PersonDetails({
  model,
  p,
  onGo,
  place,
}: {
  model: Model;
  p: GraphPerson;
  onGo: (g: Go) => void;
  place: DetailsPlace;
}) {
  const boss = p.managerId ? model.person(p.managerId) : undefined;
  const tops = model.personTopics(p);
  const made = model.authored(p.id).length;
  const joined = model.joined(p.id).length;
  const recent = [...model.authored(p.id), ...model.joined(p.id)]
    .map((id) => model.item(id)!)
    .sort((x, y) => y.date.localeCompare(x.date))
    .slice(0, 5);
  const unit = model.unit(p.unitId);
  return (
    <>
      <div className="kg-insp-head">
        <span className="kg-avatar kg-lg">{p.initials}</span>
        <div>
          <div className="kg-eyebrow">
            {place === "org" ? "Medewerker" : "Persoon"}
          </div>
          <h2>{p.name}</h2>
          <p className="kg-role">{p.role}</p>
          {p.awayUntil ? (
            <span className="kg-pill kg-warn kg-nodot">
              <Moon size={12} /> Afwezig tot {dateLabel(p.awayUntil, true)}
            </span>
          ) : (
            <span className="kg-pill kg-ok">Beschikbaar</span>
          )}
        </div>
      </div>
      {unit && (
        <div className="kg-crumbs">
          {model.unitPath(unit).map((u, i) => (
            <span key={u.id}>
              {i > 0 && <span aria-hidden="true">›</span>}
              <button
                type="button"
                onClick={() => onGo({ to: "org", kind: "unit", id: u.id })}
              >
                {u.name}
              </button>
            </span>
          ))}
        </div>
      )}
      <dl className="kg-meta">
        {boss && (
          <>
            <dt>Leidinggevende</dt>
            <dd>
              <PersonLink
                model={model}
                id={boss.id}
                onGo={onGo}
                place={place}
              />
            </dd>
          </>
        )}
        {p.isHead && (
          <>
            <dt>Leidt</dt>
            <dd>{model.membersOf(p.unitId).length - 1} teamleden</dd>
          </>
        )}
        <dt>Bijdragen</dt>
        <dd>
          {made} gemaakt · {joined} meegewerkt
        </dd>
      </dl>
      {p.expertise.length > 0 && (
        <>
          <h3>Waarom {p.first} dit weet</h3>
          <div className="kg-rows">
            {p.expertise.slice(0, 3).map((x) => (
              <div className="kg-row kg-static" key={x.signal}>
                <span className="kg-main">
                  <span className="kg-name kg-wrap">{x.signal}</span>
                  <span className="kg-bar">
                    <i
                      style={{
                        width: `${x.weight}%`,
                        background: COL.person.c,
                      }}
                    />
                  </span>
                </span>
                <span className="kg-num">{x.weight}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {tops.length > 0 && (
        <>
          <h3>Expertise</h3>
          <div className="kg-topic-chips">
            {tops.map((x) => (
              <button
                type="button"
                key={x.t.id}
                className="kg-topic-chip"
                onClick={() => onGo({ to: "topic", id: x.t.id })}
              >
                {x.t.name}
              </button>
            ))}
          </div>
        </>
      )}
      {place === "org" &&
        (recent.length ? (
          <>
            <h3>Recente kennis</h3>
            <div className="kg-rows">
              {recent.map((it) => (
                <button
                  type="button"
                  key={it.id}
                  className="kg-row"
                  onClick={() =>
                    onGo({ to: "graph", focus: { kind: "item", id: it.id } })
                  }
                >
                  <Mini kind={it.type} />
                  <span className="kg-main">
                    <span className="kg-name">{it.title}</span>
                    <span className="kg-sub">
                      {kindLabel(it)} · {fmtDate(it.date)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="kg-summary">
            Nog geen gedeelde kennis gevonden voor deze persoon.
          </p>
        ))}
      <div className="kg-btn-row">
        {place === "org" ? (
          <button
            type="button"
            className="kg-btn kg-primary"
            onClick={() =>
              onGo({ to: "graph", focus: { kind: "person", id: p.id } })
            }
          >
            Toon verbanden
          </button>
        ) : (
          <button
            type="button"
            className="kg-btn"
            onClick={() => onGo({ to: "org", kind: "person", id: p.id })}
          >
            Toon in het organigram
          </button>
        )}
      </div>
    </>
  );
}

from __future__ import annotations

from flask import Flask, redirect, render_template, request, url_for

import ai
import state
from data import get_all_returns, get_return_by_id
from formatting import format_date, format_relative_date, initials
from models import RETURN_STATUS_META, NEXT_STEP_COPY, STATUS_PIPELINE
from priority import days_until_due, urgency_score

CURRENT_USER = "Janelle Ruiz, CPA"

app = Flask(__name__)
app.jinja_env.filters["relative_date"] = format_relative_date
app.jinja_env.filters["date"] = format_date
app.jinja_env.filters["initials"] = initials
app.jinja_env.globals["STATUS_META"] = RETURN_STATUS_META
app.jinja_env.globals["STATUS_PIPELINE"] = STATUS_PIPELINE
app.jinja_env.globals["field_state"] = state.field_state
app.jinja_env.globals["field_value"] = state.field_value
app.jinja_env.globals["field_note"] = state.field_note
app.jinja_env.globals["insight_status"] = state.insight_status
app.jinja_env.globals["insight_corrected_value"] = state.insight_corrected_value
app.jinja_env.globals["insight_correction_note"] = state.insight_correction_note
app.jinja_env.globals["insight_correction_summary"] = state.insight_correction_summary


@app.route("/")
def index():
    return redirect(url_for("dashboard"))


# ---------------------------------------------------------------------------
# Dashboard — challenge 07
# ---------------------------------------------------------------------------

def _dashboard_context():
    queue = request.args.get("queue", "mine")
    status_filter = request.args.get("status", "all")
    query = request.args.get("q", "").strip().lower()

    all_returns = get_all_returns()
    scoped = (
        [r for r in all_returns if r.assigned_preparer == CURRENT_USER]
        if queue == "mine"
        else all_returns
    )
    ranked = sorted(scoped, key=urgency_score, reverse=True)
    active = [r for r in ranked if r.status != "filed"]

    kpis = {
        "active": len(active),
        "overdue": sum(1 for r in active if days_until_due(r) < 0),
        "needs_review": sum(1 for r in active if r.status == "needs_review"),
        "urgent": sum(1 for r in active if r.priority == "urgent"),
    }

    spotlight = []
    for r in active[:6]:
        spotlight.append((r, _reason_for(r)))

    filtered = ranked
    if status_filter != "all":
        filtered = [r for r in filtered if r.status == status_filter]
    if query:
        filtered = [
            r for r in filtered
            if query in f"{r.client_name} {r.business_name or ''} {r.id} {r.assigned_preparer}".lower()
        ]

    return {
        "queue": queue,
        "status_filter": status_filter,
        "query": request.args.get("q", ""),
        "kpis": kpis,
        "spotlight": spotlight,
        "filtered": filtered[:60],
        "filtered_total": len(filtered),
        "scoped_total": len(scoped),
        "days_until_due": days_until_due,
    }


@app.route("/dashboard")
def dashboard():
    ctx = _dashboard_context()
    return render_template("dashboard.html", **ctx)


@app.route("/partials/queue")
def partial_queue():
    ctx = _dashboard_context()
    return render_template("partials/queue.html", **ctx)


def _reason_for(r) -> str | None:
    dtd = days_until_due(r)
    if r.blockers:
        return r.blockers[0]
    if dtd < 0:
        n = abs(dtd)
        return f"Overdue by {n} day{'' if n == 1 else 's'}"
    if r.status == "needs_review":
        return "Waiting on your review"
    if r.open_insight_count >= 2:
        return f"{r.open_insight_count} open AI flags need a look"
    if dtd <= 3:
        return f"Due {format_relative_date(r.due_date)}"
    return None


# ---------------------------------------------------------------------------
# Returns list
# ---------------------------------------------------------------------------

HERO_IDS = {"RTN-1001", "RTN-1002", "RTN-1003"}


@app.route("/returns")
def returns_list():
    status_filter = request.args.get("status", "all")
    query = request.args.get("q", "").strip().lower()

    all_returns = get_all_returns()
    filtered = all_returns
    if status_filter != "all":
        filtered = [r for r in filtered if r.status == status_filter]
    if query:
        filtered = [
            r for r in filtered
            if query in f"{r.client_name} {r.business_name or ''} {r.id}".lower()
        ]
    filtered = sorted(filtered, key=lambda r: r.display_name)

    ctx = dict(
        returns=all_returns,
        filtered=filtered[:80],
        filtered_total=len(filtered),
        status_filter=status_filter,
        query=request.args.get("q", ""),
        hero_ids=HERO_IDS,
    )
    if request.headers.get("HX-Request"):
        return render_template("partials/returns_table.html", **ctx)
    return render_template("returns_list.html", **ctx)


# ---------------------------------------------------------------------------
# Return detail — overview (06), review/traceability (01+08), insights (10)
# ---------------------------------------------------------------------------

@app.route("/returns/<return_id>")
def return_overview(return_id: str):
    r = get_return_by_id(return_id)
    if r is None:
        return "Return not found", 404
    view = request.args.get("view", "staff")
    current_index = STATUS_PIPELINE.index(r.status)
    next_step = NEXT_STEP_COPY[r.status][view]
    owner = RETURN_STATUS_META[r.status].owner
    events = [e for e in r.audit_log if view == "staff" or e.client_visible]
    show_blockers_to_client = view == "client" and r.status == "client_action" and bool(r.blockers)

    ctx = dict(
        r=r, view=view, current_index=current_index, next_step=next_step,
        owner=owner, events=events, show_blockers_to_client=show_blockers_to_client,
        pending_insights=sum(1 for i in r.insights if state.insight_status(i) == "pending"),
    )
    if request.headers.get("HX-Request"):
        return render_template("partials/overview_body.html", **ctx)
    return render_template("returns/overview.html", **ctx)


@app.route("/returns/<return_id>/review")
def return_review(return_id: str):
    r = get_return_by_id(return_id)
    if r is None or not r.fields:
        return "Return not found or has no field-level detail", 404

    selected_id = request.args.get("field", r.fields[0].id)
    selected = next((f for f in r.fields if f.id == selected_id), r.fields[0])

    sections: list[tuple[str, list]] = []
    for f in r.fields:
        if sections and sections[-1][0] == f.section:
            sections[-1][1].append(f)
        else:
            existing = next((s for s in sections if s[0] == f.section), None)
            if existing:
                existing[1].append(f)
            else:
                sections.append((f.section, [f]))

    return render_template(
        "returns/review.html", r=r, sections=sections, selected=selected,
        pending_insights=sum(1 for i in r.insights if state.insight_status(i) == "pending"),
    )


def _field_sections(r):
    sections: list[tuple[str, list]] = []
    for f in r.fields:
        existing = next((s for s in sections if s[0] == f.section), None)
        if existing:
            existing[1].append(f)
        else:
            sections.append((f.section, [f]))
    return sections


@app.route("/returns/<return_id>/review/field-detail")
def field_detail_partial(return_id: str):
    r = get_return_by_id(return_id)
    field_id = request.args.get("field")
    selected = next((f for f in r.fields if f.id == field_id), r.fields[0])
    confirming = request.args.get("confirming") == selected.id
    return render_template(
        "partials/field_click_response.html", r=r, selected=selected,
        confirming=confirming, sections=_field_sections(r),
    )


@app.route("/returns/<return_id>/review/field/<field_id>/approve", methods=["POST"])
def approve_field(return_id: str, field_id: str):
    state.approve_field(field_id)
    return redirect(url_for("field_detail_partial", return_id=return_id, field=field_id))


@app.route("/returns/<return_id>/review/field/<field_id>/reject", methods=["POST"])
def reject_field(return_id: str, field_id: str):
    state.reject_field(field_id)
    return redirect(url_for("field_detail_partial", return_id=return_id, field=field_id))


@app.route("/returns/<return_id>/review/field/<field_id>/revert", methods=["POST"])
def revert_field(return_id: str, field_id: str):
    state.revert_field(field_id)
    return redirect(url_for("field_detail_partial", return_id=return_id, field=field_id))


@app.route("/returns/<return_id>/review/field/<field_id>/save", methods=["POST"])
def save_field(return_id: str, field_id: str):
    value = request.form.get("value", "")
    state.save_field_value(field_id, value)
    return redirect(url_for("field_detail_partial", return_id=return_id, field=field_id))


def _sorted_insights(r):
    return sorted(r.insights, key=lambda i: (state.insight_status(i) != "pending", -i.confidence))


@app.route("/returns/<return_id>/insights")
def return_insights(return_id: str):
    r = get_return_by_id(return_id)
    if r is None or not r.insights:
        return render_template("returns/insights_empty.html", r=r)

    sorted_insights = _sorted_insights(r)
    selected_id = request.args.get("insight", sorted_insights[0].id)
    selected = next((i for i in r.insights if i.id == selected_id), sorted_insights[0])

    return render_template(
        "returns/insights.html", r=r, sorted_insights=sorted_insights, selected=selected,
        pending_insights=sum(1 for i in r.insights if state.insight_status(i) == "pending"),
    )


@app.route("/returns/<return_id>/insights/detail")
def insight_detail_partial(return_id: str):
    r = get_return_by_id(return_id)
    insight_id = request.args.get("insight")
    selected = next((i for i in r.insights if i.id == insight_id), r.insights[0])
    correcting = request.args.get("correcting") == selected.id
    return render_template(
        "partials/insight_click_response.html", r=r, selected=selected,
        correcting=correcting, sorted_insights=_sorted_insights(r),
    )


@app.route("/returns/<return_id>/insights/<insight_id>/accept", methods=["POST"])
def accept_insight(return_id: str, insight_id: str):
    state.accept_insight(insight_id)
    return redirect(url_for("insight_detail_partial", return_id=return_id, insight=insight_id))


@app.route("/returns/<return_id>/insights/<insight_id>/dismiss", methods=["POST"])
def dismiss_insight(return_id: str, insight_id: str):
    state.dismiss_insight(insight_id)
    return redirect(url_for("insight_detail_partial", return_id=return_id, insight=insight_id))


@app.route("/returns/<return_id>/insights/<insight_id>/correct", methods=["POST"])
def correct_insight(return_id: str, insight_id: str):
    value = request.form.get("value", "(no value entered)")
    note = request.form.get("note", "")

    r = get_return_by_id(return_id)
    insight = next((i for i in r.insights if i.id == insight_id), None) if r else None
    field_label = insight.title if insight else "this value"
    linked_field = None
    if r and insight and insight.field_id:
        linked_field = next((f for f in r.fields if f.id == insight.field_id), None)
    ai_value = state.field_value(linked_field) if linked_field else "the AI-suggested value"
    summary = ai.summarize_correction(field_label, ai_value, value, note)

    state.correct_insight(insight_id, value, note, summary)
    return redirect(url_for("insight_detail_partial", return_id=return_id, insight=insight_id))


@app.route("/reset-demo", methods=["POST"])
def reset_demo():
    state.reset_all()
    return redirect(request.referrer or url_for("dashboard"))


if __name__ == "__main__":
    app.run(debug=True, port=5001)

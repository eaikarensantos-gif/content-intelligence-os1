# Instagram Metrics Report Skill

Generate a comprehensive Instagram performance report from the app's metrics data, with platform-specific insights and actionable recommendations.

## When to use

Invoke this skill when the user asks for an Instagram metrics report, Instagram performance analysis, or Instagram-specific insights.

## Codebase context

- **App:** Content Intelligence OS — a React + Zustand + Recharts creator analytics platform
- **State store:** `/src/store/useStore.js` — `metrics[]`, `posts[]`, `ideas[]`
- **Analytics utils:** `/src/utils/analytics.js` — `enrichMetric`, `aggregateByPlatform`, `generateInsights`, `topPosts`, `timelineData`
- **Metric model fields:** `id`, `post_id`, `platform`, `date`, `impressions`, `reach`, `likes`, `comments`, `shares`, `saves`, `link_clicks`
- **Derived fields (via enrichMetric):** `engagement` (likes+comments+shares+saves), `engagement_rate` (engagement/impressions), `authority_score` (shares+saves)
- **Platform badge color:** pink (`#ec4899`) for Instagram

## Report structure to generate

When the user invokes this skill, produce a report with these sections:

### 1. Summary KPIs (filter `metrics` where `platform === 'instagram'`)
- Total impressions
- Total reach
- Average engagement rate (benchmark: >3% is good, >5% is excellent)
- Total likes, comments, shares, saves
- Authority score (shares + saves — measures content virality/save-worthiness)
- Link clicks (conversion signal)

### 2. Top Instagram Posts
List up to 5 posts sorted by impressions, showing title, format, engagement rate, and authority score.

### 3. Content Format Breakdown
Which formats (Reel, Carousel, Static, Story, etc.) perform best on Instagram by:
- Average engagement rate
- Average reach
- Authority score per post

### 4. Trend Analysis
Compare performance over time — identify if engagement is trending up or down across the most recent 30 days vs prior period.

### 5. Actionable Recommendations
Based on the data, provide 3–5 specific recommendations such as:
- Best posting format to double down on
- Hook types that drive saves/shares
- Optimal content frequency
- Whether link clicks suggest strong conversion intent

## Instagram-specific benchmarks

| Metric | Below avg | Average | Good | Excellent |
|---|---|---|---|---|
| Engagement rate | <1% | 1–3% | 3–5% | >5% |
| Reach rate (reach/followers) | <10% | 10–20% | 20–35% | >35% |
| Save rate (saves/reach) | <0.5% | 0.5–1% | 1–2% | >2% |
| Share rate (shares/reach) | <0.1% | 0.1–0.5% | 0.5–1% | >1% |

## How to execute

1. Read `/src/store/useStore.js` to understand current state shape
2. Read `/src/utils/analytics.js` to reuse existing calculation functions
3. Filter metrics for Instagram: `metrics.filter(m => m.platform === 'instagram')`
4. Run the enrichment and aggregation logic to compute KPIs
5. Cross-reference `posts[]` via `post_id` to get format, hook_type, title
6. Format the report in markdown with clear sections
7. Highlight the single most important insight at the top

## Output format

Return a clean markdown report the user can read inline. Use tables for KPI summaries and top posts. Bold the key numbers. End with a prioritized action list.

If there is no Instagram data yet, guide the user to add metrics via the "Add Metrics" button in Analytics, selecting Instagram as the platform.

## New: Dynamic Reports Page

The app now includes a fully interactive Reports page (`/reports` or "Relatórios" in sidebar) that generates dynamic metrics reports with:

- **Interactive Dashboard**: Real-time charts that respond to hover/filter actions
- **Customizable Branding**: Set primary color, fonts, logo, company name inline
- **Content Analysis**:
  - 🏆 Top 10 posts by engagement (with direct Instagram links)
  - 📉 Bottom 5 underperforming posts
  - 🔗 Most converting content (sorted by link clicks)
  - ⏰ 5 most active posting times
- **Audience Demographics**: Gender distribution, top cities, age ranges
- **Strategic Insights**: AI-generated insights on:
  - Best-performing formats to double down
  - Hook types that generate shares/saves
  - Engagement vs benchmarks (3%+ is good)
  - Save rate analysis for viral potential
  - Link click analysis for conversion signals
- **Action Plan**: 5-week roadmap with specific recommendations
- **Smart Filters**: Toggle posts vs stories to see format-specific metrics

The page uses existing store data (`metrics[]`, `posts[]`) and analytics utilities for instant rendering.
Access at: https://content-intelligence-os1.vercel.app/reports

/* MAMO BOAT Behavior Insights v2
 * Small, evidence-backed observations from the user's own history.
 * No race prediction, personality score, diagnosis, or population ranking.
 */
(() => {
  "use strict";
  if (window.__MAMO_BEHAVIOR_INSIGHTS_V2__) return;
  window.__MAMO_BEHAVIOR_INSIGHTS_V2__ = true;

  const APP_KEY = "mamoboat_v40_personal";
  const RECORD_KEY = "mamoboat_record_v1";
  const JOURNEY_KEY = "mamoboat_decision_journeys_v1";
  const FEEDBACK_KEY = "mamoboat_behavior_feedback_v2";
  const DAY = 86400000;
  const CURRENT_DAYS = 30;
  const PLAN_RANK = Object.freeze({ free: 0, bronze: 1, silver: 2, gold: 3 });
  const PLAN_LABEL = Object.freeze({
    0: "FREE",
    1: "BRONZE / MAMO RECORD",
    2: "SILVER / MAMO INSIGHT",
    3: "GOLD / MAMO PRESS",
  });
  const MASCOT = "assets/mamokamo-ai-v5.png?v=20260822-5";

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch (_) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };
  const arr = (value) => Array.isArray(value) ? value : [];
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const mean = (values) => values.length
    ? values.reduce((sum, value) => sum + number(value), 0) / values.length
    : 0;
  const one = (value) => Number(value).toFixed(1);
  const integer = (value) => Math.round(number(value)).toLocaleString("ja-JP");
  const percent = (value) => `${Math.round(number(value) * 100)}%`;
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const timeOf = (value) => {
    const result = new Date(value || 0).getTime();
    return Number.isFinite(result) ? result : 0;
  };
  const recordTime = (record) => timeOf(record?.time || record?.recordedAt || record?.raceDate);
  const recordId = (record) => String(record?.id || [
    record?.time, record?.raceDate, record?.venueCode || record?.venue, record?.raceNo, record?.stake,
  ].filter((value) => value != null && value !== "").join(":"));
  const lineCount = (record) => arr(record?.lines).length;
  const dateKey = (record) => String(record?.raceDate || "") || (() => {
    const ms = recordTime(record);
    if (!ms) return "";
    return new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
  })();
  const sameDay = (left, right) => dateKey(left) && dateKey(left) === dateKey(right);
  const statusOf = (record) => {
    const status = String(record?.status || "").toLowerCase();
    if (["hit", "won", "win"].includes(status)) return "hit";
    if (["miss", "lost", "loss"].includes(status)) return "miss";
    return status;
  };

  function source() {
    const app = read(APP_KEY, {}) || {};
    const record = read(RECORD_KEY, {}) || {};
    const journeys = read(JOURNEY_KEY, []);
    return {
      now: Date.now(),
      plan: String(app?.pressroom?.plan || "free"),
      records: arr(app.records),
      realBetExits: arr(app.realBetExits),
      reflections: record.reflections || {},
      postReflections: record.postReflections || {},
      skipReflections: record.skipReflections || {},
      journeys: arr(journeys),
    };
  }

  function inWindow(items, start, end, getter = (item) => item?.time || item?.at || item?.updatedAt) {
    return arr(items).filter((item) => {
      const ms = timeOf(getter(item));
      return ms >= start && ms < end;
    });
  }

  function sortedRecords(records) {
    return arr(records).slice().sort((left, right) => recordTime(left) - recordTime(right));
  }

  function groupByDay(records) {
    const grouped = new Map();
    records.forEach((record) => {
      const key = dateKey(record);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    });
    return [...grouped.values()].map(sortedRecords);
  }

  function sessions(records) {
    const result = [];
    let current = [];
    sortedRecords(records).forEach((record) => {
      const previous = current[current.length - 1];
      const gap = previous ? (recordTime(record) - recordTime(previous)) / 60000 : 0;
      if (previous && (!sameDay(previous, record) || gap > 90 || gap < 0)) {
        result.push(current);
        current = [];
      }
      current.push(record);
    });
    if (current.length) result.push(current);
    return result;
  }

  function immediateNext(records, record, minutes = 30) {
    const list = sortedRecords(records);
    const index = list.indexOf(record);
    if (index < 0 || index >= list.length - 1) return null;
    const next = list[index + 1];
    const gap = (recordTime(next) - recordTime(record)) / 60000;
    return sameDay(record, next) && gap >= 0 && gap <= minutes ? { record: next, gap } : null;
  }

  function followStats(records, predicate) {
    const selected = records.filter(predicate);
    const followed = selected.filter((record) => immediateNext(records, record, 30)).length;
    return { count: selected.length, followed, rate: selected.length ? followed / selected.length : 0 };
  }

  function psych(record, reflections) {
    const reflection = reflections[recordId(record)] || {};
    const hasAppConfidence = Number.isFinite(Number(record?.conf));
    const hasAppUrge = Number.isFinite(Number(record?.urge));
    return {
      confidence: hasAppConfidence ? Number(record.conf) : Number.isFinite(Number(reflection.conviction)) ? Number(reflection.conviction) * 2 : null,
      urge: hasAppUrge ? Number(record.urge) : Number.isFinite(Number(reflection.cashUrge)) ? Number(reflection.cashUrge) * 2 : null,
    };
  }

  function insight(data) {
    return {
      safety: false,
      protective: false,
      requiredRank: 0,
      priority: 0,
      evidenceCount: 0,
      ...data,
    };
  }

  function dailyRhythm(current, previous) {
    const days = groupByDay(current);
    if (!days.length) return null;
    const activeAverage = mean(days.map((day) => day.length));
    const previousDays = groupByDay(previous);
    const previousAverage = previousDays.length ? mean(previousDays.map((day) => day.length)) : null;
    const singleDays = days.filter((day) => day.length === 1).length;
    const comparison = previousAverage != null
      ? `前の30日は参加日あたり平均${one(previousAverage)}レース。直近30日は${one(activeAverage)}レースです。`
      : `${days.length}日分のうち、1レースで終えた日は${singleDays}日です。`;
    const changed = previousAverage != null && Math.abs(activeAverage - previousAverage) >= .35;
    return insight({
      id: "daily_rhythm",
      requiredRank: 0,
      priority: changed ? 52 : 22,
      evidenceCount: current.length,
      eyebrow: "参加のペース",
      title: changed ? "1日の参加数が、前の30日から変わりました" : "参加した日の終わり方を確認",
      observation: comparison,
      evidence: `直近30日 ${days.length}日・${current.length}レース`,
      visual: previousAverage != null ? {
        type: "compare",
        left: { label: "前の30日", value: `${one(previousAverage)}回`, amount: previousAverage },
        right: { label: "直近30日", value: `${one(activeAverage)}回`, amount: activeAverage },
      } : {
        type: "donut",
        label: "1レースで終了した日",
        value: days.length ? singleDays / days.length : 0,
        valueLabel: `${singleDays}/${days.length}日`,
      },
      question: "この参加数は、自分の感覚と合っていますか？",
      choices: [["matches", "感覚と合っている"], ["more", "思ったより多い"], ["less", "思ったより少ない"]],
    });
  }

  function smallEntry(current) {
    const hundred = followStats(current, (record) => number(record.stake) === 100);
    if (hundred.count < 2) return null;
    const other = followStats(current, (record) => number(record.stake) !== 100);
    const comparable = other.count >= 2;
    const difference = comparable ? hundred.rate - other.rate : hundred.rate;
    const title = "100Bで始めた後の流れ";
    const observation = comparable
      ? `100Bで参加した${hundred.count}回のうち、30分以内に次のレースへ進んだのは${hundred.followed}回でした。ほかの金額では${other.count}回のうち${other.followed}回でした。`
      : `100Bで参加した${hundred.count}回のうち、30分以内に次のレースへ進んだのは${hundred.followed}回でした。`;
    return insight({
      id: "small_entry_follow",
      requiredRank: 0,
      priority: 58 + Math.round(Math.abs(difference) * 30),
      evidenceCount: hundred.count + (comparable ? other.count : 0),
      eyebrow: "100Bで始めた後",
      title,
      observation,
      evidence: `100B ${hundred.count}回${comparable ? ` / ほかの金額 ${other.count}回` : ""}`,
      visual: {
        type: "compare",
        left: { label: "100B", value: percent(hundred.rate), amount: hundred.rate },
        right: { label: "ほかの金額", value: comparable ? percent(other.rate) : "比較待ち", amount: comparable ? other.rate : 0 },
        caption: "30分以内に次のレースへ進んだ割合",
      },
      question: "100Bを選んだときの気持ちは、どれに近いですか？",
      choices: [["stop_one", "この1レースで終えるつもりだった"], ["watch_continue", "様子を見て続けるつもりだった"], ["undecided", "特に決めていなかった"]],
    });
  }

  function skipEffect(current, skipReflections, start, end) {
    const skips = inWindow(Object.values(skipReflections || {}), start, end, (item) => item?.recordedAt);
    if (skips.length < 2) return null;
    const stopped = skips.filter((skip) => {
      const at = timeOf(skip.recordedAt);
      const day = String(skip.raceDate || "");
      return !current.some((record) => dateKey(record) === day && recordTime(record) > at);
    }).length;
    return insight({
      id: "skip_held",
      requiredRank: 0,
      priority: 66,
      evidenceCount: skips.length,
      protective: true,
      eyebrow: "見送れた場面",
      title: stopped >= Math.ceil(skips.length / 2)
        ? "見送りが、その日の区切りになっています"
        : "見送ったあとに再参加した日もあります",
      observation: `見送り記録${skips.length}回のうち、${stopped}回はそのあと同じ日にAIR BETをしていません。`,
      evidence: `自己申告した見送り ${skips.length}回`,
      visual: {
        type: "donut",
        label: "その日の区切りになった見送り",
        value: skips.length ? stopped / skips.length : 0,
        valueLabel: `${stopped}/${skips.length}回`,
      },
      question: "見送れた時、何がいちばん効いていましたか？",
      choices: [["weak_reason", "買いたい根拠が弱かった"], ["budget", "上限や予算を意識した"], ["step_away", "いったん離れて落ち着いた"]],
    });
  }

  function casualFollow(current) {
    const casual = followStats(current, (record) => String(record.reason || "").trim() === "なんとなく");
    const other = followStats(current, (record) => String(record.reason || "").trim() !== "なんとなく");
    if (casual.count < 2 || other.count < 2) return null;
    const difference = casual.rate - other.rate;
    return insight({
      id: "casual_follow",
      requiredRank: 1,
      priority: 55 + Math.round(Math.abs(difference) * 35),
      evidenceCount: casual.count + other.count,
      eyebrow: "参加理由と続き方",
      title: difference >= .15
        ? "「なんとなく」の後は、次へ続く割合が高め"
        : difference <= -.15
          ? "「なんとなく」でも、その回で止まることが多い"
          : "「なんとなく」だけが続く理由ではなさそう",
      observation: `「なんとなく」の後に30分以内で次へ進んだ割合は${percent(casual.rate)}。他の理由では${percent(other.rate)}でした。`,
      evidence: `なんとなく ${casual.count}回 / その他 ${other.count}回`,
      visual: {
        type: "compare",
        left: { label: "なんとなく", value: percent(casual.rate), amount: casual.rate },
        right: { label: "ほかの理由", value: percent(other.rate), amount: other.rate },
        caption: "30分以内に次へ進んだ割合",
      },
      question: "次へ進んだ時、最初の理由はまだ残っていましたか？",
      choices: [["reason_remained", "最初の理由が残っていた"], ["new_reason", "別の理由で次へ進んだ"], ["not_remember", "覚えていない"]],
    });
  }

  function convictionLines(current, reflections) {
    const withPsych = current.map((record) => ({ record, ...psych(record, reflections) }));
    const low = withPsych.filter((item) => item.confidence != null && item.confidence <= 4);
    const high = withPsych.filter((item) => item.confidence != null && item.confidence >= 7);
    if (low.length < 2 || high.length < 2) return null;
    const lowLines = mean(low.map((item) => lineCount(item.record)));
    const highLines = mean(high.map((item) => lineCount(item.record)));
    const lowStake = mean(low.map((item) => number(item.record.stake)));
    const highStake = mean(high.map((item) => number(item.record.stake)));
    return insight({
      id: "conviction_lines",
      requiredRank: 1,
      priority: 62 + Math.round(Math.min(20, Math.abs(lowLines - highLines) * 5)),
      evidenceCount: low.length + high.length,
      eyebrow: "納得度と買い目数",
      title: lowLines > highLines + .5
        ? "納得度が低い時ほど、買い目が広がっています"
        : highLines > lowLines + .5
          ? "納得度が高い時の方が、買い目が多めです"
          : "納得度で、買い目数は大きく変わっていません",
      observation: `納得度が低い時は平均${one(lowLines)}点・${integer(lowStake)}B。高い時は平均${one(highLines)}点・${integer(highStake)}Bでした。`,
      evidence: `低い時 ${low.length}回 / 高い時 ${high.length}回`,
      visual: {
        type: "compare",
        left: { label: "納得度が低い時", value: `${one(lowLines)}点`, amount: lowLines },
        right: { label: "納得度が高い時", value: `${one(highLines)}点`, amount: highLines },
        caption: "1レースの平均買い目数",
      },
      question: "自信がない時に買い目が増える理由は、どれに近いですか？",
      choices: [["reassurance", "増やすと安心できた"], ["not_narrowed", "狙いを絞りきれなかった"], ["not_related", "自信とは関係なかった"]],
    });
  }

  function sessionProgress(current) {
    const groups = sessions(current).filter((group) => group.length >= 3);
    const first = groups.map((group) => group[0]);
    const later = groups.flatMap((group) => group.slice(2));
    if (first.length < 2 || later.length < 2) return null;
    const firstStake = mean(first.map((record) => number(record.stake)));
    const laterStake = mean(later.map((record) => number(record.stake)));
    const firstLines = mean(first.map(lineCount));
    const laterLines = mean(later.map(lineCount));
    return insight({
      id: "session_progress",
      requiredRank: 1,
      priority: 60 + Math.round(Math.min(25, Math.abs(laterStake - firstStake) / Math.max(1, firstStake) * 20)),
      evidenceCount: first.length + later.length,
      eyebrow: "参加順と金額",
      title: laterStake > firstStake * 1.15
        ? "3レース目以降に、AIR BET額が上がっています"
        : laterStake < firstStake * .85
          ? "3レース目以降は、AIR BET額を抑えています"
          : "続けても、AIR BET額は大きく変わっていません",
      observation: `参加区間の1レース目は平均${integer(firstStake)}B・${one(firstLines)}点。3レース目以降は${integer(laterStake)}B・${one(laterLines)}点でした。`,
      evidence: `3レース以上続いた区間 ${groups.length}回`,
      visual: {
        type: "compare",
        left: { label: "1レース目", value: `${integer(firstStake)}B`, amount: firstStake },
        right: { label: "3レース目以降", value: `${integer(laterStake)}B`, amount: laterStake },
        caption: "平均AIR BET額",
      },
      question: "3レース目は、最初と同じ基準で選べていましたか？",
      choices: [["same_standard", "同じ基準で選べた"], ["looser_standard", "基準が少し緩んだ"], ["not_remember", "覚えていない"]],
    });
  }

  function afterResult(current, result) {
    const targets = [];
    for (let index = 0; index < current.length - 1; index += 1) {
      const previous = current[index];
      const next = current[index + 1];
      const gap = (recordTime(next) - recordTime(previous)) / 60000;
      if (statusOf(previous) === result && sameDay(previous, next) && gap >= 0 && gap <= 30) {
        targets.push({ previous, next, gap });
      }
    }
    if (targets.length < 2) return null;
    const targetIds = new Set(targets.map((item) => recordId(item.next)));
    const baseline = current.filter((record) => !targetIds.has(recordId(record)));
    if (baseline.length < 2) return null;
    const targetStake = mean(targets.map((item) => number(item.next.stake)));
    const baseStake = mean(baseline.map((record) => number(record.stake)));
    const targetLines = mean(targets.map((item) => lineCount(item.next)));
    const baseLines = mean(baseline.map(lineCount));
    const averageGap = mean(targets.map((item) => item.gap));
    const ratio = baseStake > 0 ? targetStake / baseStake : 1;
    const linesRatio = baseLines > 0 ? targetLines / baseLines : 1;
    const isMiss = result === "miss";
    const safety = isMiss && (ratio >= 1.25 || linesRatio >= 1.5);
    return insight({
      id: isMiss ? "after_miss_change" : "after_hit_change",
      requiredRank: safety ? 0 : 2,
      priority: (safety ? 100 : 67) + Math.round(Math.min(20, Math.abs(ratio - 1) * 20)),
      evidenceCount: targets.length,
      safety,
      eyebrow: safety ? "安全に関わる気づき" : isMiss ? "不的中直後" : "的中直後",
      title: ratio >= 1.15
        ? `${isMiss ? "不的中" : "的中"}直後は、普段よりAIR BET額が大きめ`
        : ratio <= .85
          ? `${isMiss ? "不的中" : "的中"}直後は、普段よりAIR BET額を抑えています`
          : `${isMiss ? "不的中" : "的中"}直後も、金額は普段とほぼ同じ`,
      observation: `${isMiss ? "不的中" : "的中"}後30分以内の次レースは平均${integer(targetStake)}B・${one(targetLines)}点。普段は${integer(baseStake)}B・${one(baseLines)}点でした。`,
      evidence: `${isMiss ? "不的中" : "的中"}後 ${targets.length}場面 / 次まで平均${integer(averageGap)}分`,
      visual: {
        type: "compare",
        left: { label: "普段", value: `${integer(baseStake)}B`, amount: baseStake },
        right: { label: `${isMiss ? "不的中" : "的中"}直後`, value: `${integer(targetStake)}B`, amount: targetStake },
        caption: "次のレースの平均AIR BET額",
      },
      question: `次を選んだ理由は、そのレース自体ですか。それとも直前の${isMiss ? "不的中" : "的中"}ですか？`,
      choices: [["next_race", "次のレース自体を選んだ"], ["previous_result", `直前の${isMiss ? "不的中" : "的中"}に引っぱられた`], ["both", "両方あった"]],
    });
  }

  function urgeMismatch(current, reflections) {
    const values = current.map((record) => ({ record, ...psych(record, reflections) }))
      .filter((item) => item.confidence != null && item.urge != null);
    const mismatch = values.filter((item) => item.confidence <= 4 && item.urge >= 7);
    const other = values.filter((item) => !(item.confidence <= 4 && item.urge >= 7));
    if (mismatch.length < 2 || other.length < 2) return null;
    const mismatchStake = mean(mismatch.map((item) => number(item.record.stake)));
    const otherStake = mean(other.map((item) => number(item.record.stake)));
    const mismatchLines = mean(mismatch.map((item) => lineCount(item.record)));
    const otherLines = mean(other.map((item) => lineCount(item.record)));
    const safety = mismatchStake >= otherStake * 1.25 || mismatchLines >= otherLines * 1.5;
    return insight({
      id: "urge_conviction_gap",
      requiredRank: safety ? 0 : 2,
      priority: safety ? 96 : 72,
      evidenceCount: mismatch.length + other.length,
      safety,
      eyebrow: safety ? "安全に関わる気づき" : "納得度と衝動",
      title: mismatchStake > otherStake * 1.15 || mismatchLines > otherLines + .5
        ? "納得より勢いが先に出た時、参加が広がっています"
        : "納得より勢いが先でも、参加量は増えていません",
      observation: `納得度が低く現金衝動が高い時は平均${integer(mismatchStake)}B・${one(mismatchLines)}点。その他は${integer(otherStake)}B・${one(otherLines)}点でした。`,
      evidence: `該当 ${mismatch.length}回 / 比較 ${other.length}回`,
      visual: {
        type: "compare",
        left: { label: "普段に近い時", value: `${integer(otherStake)}B`, amount: otherStake },
        right: { label: "勢いが先の時", value: `${integer(mismatchStake)}B`, amount: mismatchStake },
        caption: "平均AIR BET額",
      },
      question: "この時は、どちらの気持ちが強かったですか？",
      choices: [["urge_now", "今すぐ賭けたい気持ち"], ["race_reason", "このレースで勝負したい根拠"], ["neither", "どちらとも言えない"]],
    });
  }

  function convictionSatisfaction(current, reflections, postReflections) {
    const joined = current.map((record) => ({
      reflection: reflections[recordId(record)],
      post: postReflections[recordId(record)],
    })).filter((item) => item.reflection && item.post && !item.post.dismissed);
    const high = joined.filter((item) => number(item.reflection.conviction) >= 4);
    const low = joined.filter((item) => number(item.reflection.conviction) <= 2);
    if (high.length < 2 || low.length < 2) return null;
    const highSatisfied = high.filter((item) => item.post.emotion === "satisfied").length / high.length;
    const lowSatisfied = low.filter((item) => item.post.emotion === "satisfied").length / low.length;
    return insight({
      id: "conviction_satisfaction",
      requiredRank: 2,
      priority: 78 + Math.round(Math.abs(highSatisfied - lowSatisfied) * 20),
      evidenceCount: high.length + low.length,
      eyebrow: "参加前と結果後",
      title: highSatisfied > lowSatisfied + .15
        ? "参加前に納得できた勝負ほど、結果後も納得しやすい"
        : "参加前の納得度だけでは、結果後の気持ちは決まっていません",
      observation: `参加前の納得度4〜5では、結果後に「納得した」が${percent(highSatisfied)}。納得度1〜2では${percent(lowSatisfied)}でした。`,
      evidence: `高い納得 ${high.length}回 / 低い納得 ${low.length}回`,
      visual: {
        type: "compare",
        left: { label: "納得度1〜2", value: percent(lowSatisfied), amount: lowSatisfied },
        right: { label: "納得度4〜5", value: percent(highSatisfied), amount: highSatisfied },
        caption: "結果後も選び方に納得した割合",
      },
      question: "当たったかではなく、選び方に納得できた回はどちらでしたか？",
      choices: [["high_conviction", "参加前の納得度が高かった回"], ["low_conviction", "参加前の納得度が低かった回"], ["neither", "どちらとも言えない"]],
    });
  }

  function airToReal(current, journeys, start, end) {
    const byId = new Map(current.map((record) => [recordId(record), record]));
    const air = inWindow(journeys, start, end, (journey) => journey?.updatedAt || journey?.startedAt)
      .filter((journey) => journey?.air?.recordId && byId.has(String(journey.air.recordId)));
    const casual = air.filter((journey) => String(byId.get(String(journey.air.recordId))?.reason || "") === "なんとなく");
    const other = air.filter((journey) => String(byId.get(String(journey.air.recordId))?.reason || "") !== "なんとなく");
    if (casual.length < 2 || other.length < 2) return null;
    const realRate = (items) => items.filter((journey) => journey?.real?.source === "self_report").length / items.length;
    const casualRate = realRate(casual);
    const otherRate = realRate(other);
    return insight({
      id: "casual_air_to_real",
      requiredRank: 2,
      priority: 74 + Math.round(Math.abs(casualRate - otherRate) * 25),
      evidenceCount: casual.length + other.length,
      eyebrow: "AIRからREALへの移動",
      title: casualRate > otherRate + .15
        ? "「なんとなく」のAIR後に、実購入へ進む割合が高め"
        : "「なんとなく」だけが、実購入への移動理由ではなさそう",
      observation: `「なんとなく」のAIR後に実購入を自己申告した割合は${percent(casualRate)}。他の理由では${percent(otherRate)}でした。`,
      evidence: `自己申告を含むAIR ${casual.length + other.length}回`,
      visual: {
        type: "compare",
        left: { label: "ほかの理由", value: percent(otherRate), amount: otherRate },
        right: { label: "なんとなく", value: percent(casualRate), amount: casualRate },
        caption: "AIR後に実購入を申告した割合",
      },
      question: "AIRの後に実購入を考えた理由は、どれに近いですか？",
      choices: [["still_wanted", "もともと勝負したいレースだった"], ["stronger_after_air", "AIRの後に気持ちが強くなった"], ["not_remember", "覚えていない"]],
    });
  }

  function longTermChange(current, previous) {
    if (current.length < 5 || previous.length < 5) return null;
    const summary = (records) => ({
      daily: mean(groupByDay(records).map((day) => day.length)),
      stake: mean(records.map((record) => number(record.stake))),
      lines: mean(records.map(lineCount)),
      casual: records.filter((record) => String(record.reason || "") === "なんとなく").length / records.length,
    });
    const now = summary(current);
    const before = summary(previous);
    const choices = [
      { weight: Math.abs(now.casual - before.casual) * 2, label: "「なんとなく」の割合", before: percent(before.casual), after: percent(now.casual) },
      { weight: Math.abs(now.daily - before.daily) / Math.max(1, before.daily), label: "参加日あたりのレース数", before: one(before.daily), after: one(now.daily) },
      { weight: Math.abs(now.stake - before.stake) / Math.max(100, before.stake), label: "1レース平均AIR BET額", before: `${integer(before.stake)}B`, after: `${integer(now.stake)}B` },
      { weight: Math.abs(now.lines - before.lines) / Math.max(1, before.lines), label: "1レース平均買い目数", before: `${one(before.lines)}点`, after: `${one(now.lines)}点` },
    ].sort((left, right) => right.weight - left.weight)[0];
    return insight({
      id: "long_term_change",
      requiredRank: 3,
      priority: 70 + Math.round(Math.min(25, choices.weight * 25)),
      evidenceCount: current.length + previous.length,
      eyebrow: "30日間の変化",
      title: `いちばん変わったのは「${choices.label}」`,
      observation: `前の30日から直近30日で、${choices.label}は${choices.before}から${choices.after}へ変わりました。`,
      evidence: `直近 ${current.length}回 / 前期間 ${previous.length}回`,
      visual: {
        type: "delta",
        label: choices.label,
        before: choices.before,
        after: choices.after,
      },
      question: "この変化は、自分で選んだ変化ですか？",
      choices: [["intentional", "自分で意識して変えた"], ["unnoticed", "気づかないうちに変わった"], ["unsure", "まだ分からない"]],
    });
  }

  function buildModel(input = source()) {
    const now = number(input.now) || Date.now();
    const start = now - CURRENT_DAYS * DAY;
    const previousStart = start - CURRENT_DAYS * DAY;
    const all = sortedRecords(input.records);
    const current = all.filter((record) => recordTime(record) >= start && recordTime(record) < now + DAY);
    const previous = all.filter((record) => recordTime(record) >= previousStart && recordTime(record) < start);
    const activeDays = groupByDay(current);
    const exits = inWindow(input.realBetExits, start, now + DAY, (item) => item?.at);
    const casual = current.filter((record) => String(record.reason || "").trim() === "なんとなく");
    const candidates = [
      afterResult(current, "miss"),
      urgeMismatch(current, input.reflections || {}),
      skipEffect(current, input.skipReflections || {}, start, now + DAY),
      smallEntry(current),
      dailyRhythm(current, previous),
      casualFollow(current),
      convictionLines(current, input.reflections || {}),
      sessionProgress(current),
      afterResult(current, "hit"),
      convictionSatisfaction(current, input.reflections || {}, input.postReflections || {}),
      airToReal(current, input.journeys || [], start, now + DAY),
      longTermChange(current, previous),
    ].filter(Boolean).sort((left, right) => right.priority - left.priority || right.evidenceCount - left.evidenceCount);
    const rawPlan = String(input.plan || "free");
    const plan = Object.prototype.hasOwnProperty.call(PLAN_RANK, rawPlan) ? rawPlan : ({ ume: "bronze", take: "silver", matsu: "gold" }[rawPlan] || "free");
    return {
      version: 2,
      periodDays: CURRENT_DAYS,
      plan,
      rank: PLAN_RANK[plan],
      currentRecords: current.length,
      previousRecords: previous.length,
      metrics: {
        activeDays: activeDays.length,
        dailyAverage: activeDays.length ? mean(activeDays.map((day) => day.length)) : null,
        casualCount: casual.length,
        casualRate: current.length ? casual.length / current.length : null,
        averageLines: current.length ? mean(current.map(lineCount)) : null,
        averageStake: current.length ? mean(current.map((record) => number(record.stake))) : null,
        officialExits: exits.length,
      },
      candidates,
    };
  }

  function visibleInsights(model) {
    const limits = [1, 3, 5, 7];
    const safety = model.candidates.filter((item) => item.safety);
    const standard = model.candidates
      .filter((item) => !item.safety && item.requiredRank <= model.rank)
      .slice(0, limits[model.rank]);
    return [...safety, ...standard.filter((item) => !safety.some((safe) => safe.id === item.id))]
      .sort((left, right) => right.priority - left.priority);
  }

  function renderMetrics(model) {
    const host = document.getElementById("analysisCards");
    if (!host) return;
    host.dataset.insightVersion = "2";
    host.classList.add("behavior-base-grid");
    if (!model.currentRecords) {
      host.innerHTML = `<div class="behavior-base-empty"><b>まず1レース、記録から始めます。</b><p>AIR BET後に、回数・買い目数・平均額を表示します。0のカードは並べません。</p></div>`;
      return;
    }
    const metrics = [
      ["参加日あたり", `${one(model.metrics.dailyAverage)}レース`, `直近30日・${model.metrics.activeDays}日`],
      ["「なんとなく」参加", `${model.metrics.casualCount}回`, `全${model.currentRecords}回の${percent(model.metrics.casualRate)}`],
      ["1レース平均買い目数", `${one(model.metrics.averageLines)}点`, "組合せの数"],
      ["1レース平均AIR BET額", `${integer(model.metrics.averageStake)}B`, "仮想投票のみ"],
      ["公式投票サイトへ移動", `${model.metrics.officialExits}回`, "移動回数・購入回数ではありません"],
    ];
    host.innerHTML = metrics.map(([label, value, note]) => `<article class="stat-card behavior-base-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join("");
  }

  function feedbackState() {
    const value = read(FEEDBACK_KEY, {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function visualMarkup(item) {
    const visual = item?.visual || {};
    if (visual.type === "compare" && visual.left && visual.right) {
      const leftAmount = Math.max(0, number(visual.left.amount));
      const rightAmount = Math.max(0, number(visual.right.amount));
      const maximum = Math.max(leftAmount, rightAmount, 1);
      const barHeight = (amount) => amount > 0 ? Math.max(14, Math.round(amount / maximum * 100)) : 8;
      const aria = `${visual.caption || "比較"}。${visual.left.label} ${visual.left.value}、${visual.right.label} ${visual.right.value}`;
      return `<div class="behavior-visual behavior-visual-compare" role="img" aria-label="${esc(aria)}">
        <small>${esc(visual.caption || "いつもの自分と比較")}</small>
        <div class="behavior-chart-bars">
          <div class="behavior-chart-column"><strong>${esc(visual.left.value)}</strong><i style="--bar:${barHeight(leftAmount)}%"></i><span>${esc(visual.left.label)}</span></div>
          <div class="behavior-chart-column"><strong>${esc(visual.right.value)}</strong><i style="--bar:${barHeight(rightAmount)}%"></i><span>${esc(visual.right.label)}</span></div>
        </div>
      </div>`;
    }
    if (visual.type === "donut") {
      const percentage = Math.max(0, Math.min(100, Math.round(number(visual.value) * 100)));
      const aria = `${visual.label || "割合"} ${visual.valueLabel || `${percentage}%`}`;
      return `<div class="behavior-visual behavior-visual-donut" role="img" aria-label="${esc(aria)}">
        <div class="behavior-donut" style="--pct:${percentage}"><span><strong>${esc(visual.valueLabel || `${percentage}%`)}</strong><small>${esc(visual.label || "割合")}</small></span></div>
      </div>`;
    }
    if (visual.type === "delta") {
      const aria = `${visual.label || "変化"}。${visual.before}から${visual.after}`;
      return `<div class="behavior-visual behavior-visual-delta" role="img" aria-label="${esc(aria)}">
        <small>${esc(visual.label || "30日間の変化")}</small>
        <div><span><b>${esc(visual.before)}</b><em>前の30日</em></span><i>→</i><span><b>${esc(visual.after)}</b><em>直近30日</em></span></div>
      </div>`;
    }
    return "";
  }

  function feedbackButtons(item, selected) {
    const choices = Array.isArray(item.choices) && item.choices.length
      ? item.choices
      : [["matches", "感覚と合っている"], ["not_matches", "感覚と違う"], ["unsure", "まだ分からない"]];
    const hasSelection = choices.some(([value]) => selected === value);
    return `<div class="behavior-feedback" role="group" aria-label="振り返りへの回答">${choices.map(([value, label]) => `<button type="button" data-behavior-feedback="${esc(value)}" data-insight-id="${esc(item.id)}" class="${selected === value ? "selected" : ""}">${esc(label)}</button>`).join("")}</div><small class="behavior-feedback-status">${hasSelection ? "回答を記録しました。いつでも選び直せます。" : "今の感覚に近いものを選んでください。"}</small>`;
  }

  function insightCard(item, selected) {
    const tier = item.safety ? "全プラン共通 / SAFETY" : PLAN_LABEL[item.requiredRank];
    const tone = item.safety ? "safety" : item.protective ? "protective" : "observe";
    const detailsId = `behavior-detail-${item.id}`;
    return `<article class="behavior-insight ${tone}" data-behavior-insight="${esc(item.id)}">
      <header><div><span>${esc(item.eyebrow)}</span><small>${esc(tier)}</small></div><b>${item.safety ? "!" : item.protective ? "✓" : "↔"}</b></header>
      <h3>${esc(item.title)}</h3>
      ${visualMarkup(item)}
      <button type="button" class="behavior-detail-toggle" data-behavior-detail aria-expanded="false" aria-controls="${esc(detailsId)}"><span>詳細を見る</span><b>＋</b></button>
      <div class="behavior-detail" id="${esc(detailsId)}" hidden>
        <p class="behavior-observation">${esc(item.observation)}</p>
        <p class="behavior-evidence">根拠：${esc(item.evidence)}</p>
        <div class="behavior-question"><span>マモカモと振り返り</span><p>${esc(item.question)}</p></div>
        ${feedbackButtons(item, selected)}
      </div>
    </article>`;
  }

  function nextTier(rank) {
    if (rank === 0) return { label: PLAN_LABEL[1], text: "7日・30日や、100B・「なんとなく」など単独条件ごとの差を確認します。" };
    if (rank === 1) return { label: PLAN_LABEL[2], text: "不的中直後、納得度、現金衝動など複数条件を組み合わせて確認します。" };
    if (rank === 2) return { label: PLAN_LABEL[3], text: "朝刊・週間・月刊で、30日を超える変化と選んだテーマを届けます。" };
    return null;
  }

  function renderInsights(model) {
    const host = document.getElementById("analysisList");
    if (!host) return;
    document.documentElement?.classList?.add("mamo-insights-v2");
    host.dataset.insightVersion = "2";
    host.className = "analysis-list behavior-insights-v2";
    document.getElementById("mamoBehaviorPatternProfile")?.remove();
    const feedback = feedbackState();
    const visible = visibleInsights(model);
    const teaser = nextTier(model.rank);
    const empty = !model.currentRecords
      ? `<div class="behavior-insight-empty"><b>まだ傾向は決めつけません。</b><p>2〜3回のAIR BETでも事実は残りますが、比較できる組合せが揃ってから気づきを表示します。</p></div>`
      : `<div class="behavior-insight-empty"><b>比較できる条件を蓄積中です。</b><p>差が出ていない時は、無理に「傾向」を作りません。AIR BET前後の気持ちや見送りも記録すると精度が上がります。</p></div>`;
    host.innerHTML = `<div class="behavior-insight-intro">
      <div><small>MAMOKAMO / SMALL INSIGHTS</small><h3>マモカモの小さな気づき</h3><p>他人ではなく、普段のあなたと比べます。診断や勝敗予想はしません。</p><b>${esc(PLAN_LABEL[model.rank])}・直近30日</b></div>
      <img src="${MASCOT}" alt="AI分析担当マモカモ">
    </div>
    ${visible.length ? visible.map((item) => insightCard(item, feedback[item.id]?.value)).join("") : empty}
    ${teaser ? `<aside class="behavior-next-tier"><span>次に深く見られること</span><b>${esc(teaser.label)}</b><p>${esc(teaser.text)}</p></aside>` : ""}
    <footer class="behavior-method-note">数字は端末内の本人記録だけで算出します。差があっても原因とは断定しません。安全に関わる気づき・上限機能・データ削除は無料です。</footer>`;
  }

  function render() {
    if (!document.getElementById("analysisCards") || !document.getElementById("analysisList")) return;
    const model = buildModel();
    renderMetrics(model);
    renderInsights(model);
    window.MAMO_BEHAVIOR_PROFILE = Object.freeze({
      version: 2,
      generatedAt: new Date().toISOString(),
      plan: model.plan,
      currentRecords: model.currentRecords,
      candidateIds: model.candidates.map((item) => item.id),
    });
  }

  function onFeedback(event) {
    const detailButton = event.target?.closest?.("[data-behavior-detail]");
    if (detailButton) {
      const card = detailButton.closest("[data-behavior-insight]");
      const details = card?.querySelector(".behavior-detail");
      if (!details) return;
      const expanded = detailButton.getAttribute("aria-expanded") === "true";
      detailButton.setAttribute("aria-expanded", String(!expanded));
      details.hidden = expanded;
      const label = detailButton.querySelector("span");
      const icon = detailButton.querySelector("b");
      if (label) label.textContent = expanded ? "詳細を見る" : "詳細を閉じる";
      if (icon) icon.textContent = expanded ? "＋" : "−";
      return;
    }
    const button = event.target?.closest?.("[data-behavior-feedback]");
    if (!button) return;
    const card = button.closest("[data-behavior-insight]");
    const id = String(button.dataset.insightId || card?.dataset.behaviorInsight || "");
    const value = String(button.dataset.behaviorFeedback || "");
    if (!id || !/^[a-z0-9_:-]{1,40}$/.test(value)) return;
    const feedback = feedbackState();
    feedback[id] = { value, at: new Date().toISOString() };
    const entries = Object.entries(feedback).sort((left, right) => timeOf(right[1]?.at) - timeOf(left[1]?.at)).slice(0, 300);
    write(FEEDBACK_KEY, Object.fromEntries(entries));
    card?.querySelectorAll("[data-behavior-feedback]").forEach((item) => item.classList.toggle("selected", item === button));
    const status = card?.querySelector(".behavior-feedback-status");
    if (status) status.textContent = "回答を記録しました。いつでも選び直せます。";
    try {
      window.MAMO_TRACK_EVENT?.("press_feedback_recorded", { issue_key: `behavior:${id}`, response: value, insight_version: 2 }, { screen: "analysis" });
    } catch (_) {}
  }

  function styles() {
    if (document.getElementById("mamoBehaviorInsightsV2Style")) return;
    const style = document.createElement("style");
    style.id = "mamoBehaviorInsightsV2Style";
    style.textContent = `
      html.mamo-insights-v2 #mamoBehaviorPatternProfile,
      html.mamo-insights-v2 #mamoDecisionPanel,
      html.mamo-insights-v2 #mamoBaselinePanel,
      html.mamo-insights-v2 #mamoTriggerPanel,
      html.mamo-insights-v2 #mamoPeriodTriggerSummary{display:none!important}
      #analysisCards.behavior-base-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #analysisCards .behavior-base-card{min-width:0;padding:12px;border-top-color:#08233d}
      #analysisCards .behavior-base-card span{line-height:1.35}
      #analysisCards .behavior-base-card strong{overflow-wrap:anywhere}
      #analysisCards .behavior-base-card small{display:block;margin-top:4px;color:#73838a;font-size:8px;line-height:1.45}
      #analysisCards .behavior-base-card:last-child:nth-child(odd){grid-column:1/-1}
      .behavior-base-empty{grid-column:1/-1;padding:15px;border:1px solid #dce5e7;border-radius:14px;background:#fff}
      .behavior-base-empty b{font-size:14px;color:#08233d}.behavior-base-empty p{margin:5px 0 0;color:#6a7a82;font-size:10px;line-height:1.6}
      #analysisList.behavior-insights-v2{display:grid;gap:11px;margin-top:8px}
      .behavior-insight-loading{padding:16px;border:1px solid #dce5e7;border-radius:14px;background:#fff;color:#60727a;font-size:11px}
      .behavior-insight-intro{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:12px;align-items:center;padding:14px;border:1px solid #ded5bb;border-top:5px solid #d4a128;border-radius:17px;background:linear-gradient(120deg,#fffdf6,#fff,#f2fbfb);box-shadow:0 6px 16px rgba(8,35,61,.06)}
      .behavior-insight-intro small{display:block;color:#98701d;font-size:8px;font-weight:1000;letter-spacing:.14em}.behavior-insight-intro h3{margin:3px 0;color:#08233d;font-size:20px}.behavior-insight-intro p{margin:0;color:#60717a;font-size:10px;line-height:1.55}.behavior-insight-intro b{display:block;margin-top:7px;color:#087f7a;font-size:9px}.behavior-insight-intro img{width:94px;height:88px;object-fit:contain;filter:drop-shadow(0 5px 6px rgba(8,35,61,.13))}
      .behavior-insight{--accent:#0aa49a;padding:14px;border:1px solid #dfe6e6;border-left:6px solid var(--accent);border-radius:17px;background:#fff;box-shadow:0 6px 15px rgba(8,35,61,.055)}
      .behavior-insight.safety{--accent:#e45858;background:linear-gradient(110deg,#fff8f8,#fff)}.behavior-insight.protective{--accent:#18a77f;background:linear-gradient(110deg,#f4fffb,#fff)}
      .behavior-insight header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.behavior-insight header span{display:block;color:var(--accent);font-size:9px;font-weight:1000;letter-spacing:.08em}.behavior-insight header small{display:block;margin-top:2px;color:#79878d;font-size:7px;font-weight:900}.behavior-insight header>b{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--accent);color:#fff;font-size:15px}
      .behavior-insight h3{margin:8px 0 10px;color:#08233d;font-size:20px;line-height:1.32;letter-spacing:-.03em}
      .behavior-visual{overflow:hidden;margin-top:4px;border:1px solid #dce5ed;border-radius:14px;background:linear-gradient(145deg,#fff 0%,#f5f9fc 100%)}
      .behavior-visual>small{display:block;padding:10px 12px 0;color:#617784;font-size:9px;font-weight:1000;letter-spacing:.04em}
      .behavior-chart-bars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;height:160px;margin:0 13px;padding:12px 8px 10px;border-bottom:2px solid #b8c7d2}
      .behavior-chart-column{display:grid;grid-template-rows:auto minmax(0,1fr) auto;min-width:0;height:100%;justify-items:center;gap:6px}
      .behavior-chart-column strong{color:#08233d;font-size:25px;font-weight:1000;line-height:1;letter-spacing:-.04em;white-space:nowrap}
      .behavior-chart-column i{align-self:end;display:block;width:68%;min-width:32px;height:var(--bar);min-height:8px;border-radius:8px 8px 2px 2px;background:linear-gradient(180deg,#1b578c,#0a3157);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
      .behavior-chart-column:last-child i{background:linear-gradient(180deg,#ef3441,#c91423)}
      .behavior-chart-column span{overflow-wrap:anywhere;color:#435b69;font-size:9px;font-weight:1000;line-height:1.25;text-align:center}
      .behavior-visual-donut{display:grid;place-items:center;min-height:210px;padding:18px}
      .behavior-donut{display:grid;place-items:center;width:164px;height:164px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--pct) * 1%),#e4ebf0 0);box-shadow:inset 0 0 0 1px rgba(8,35,61,.06)}
      .behavior-donut>span{display:grid;place-items:center;width:116px;height:116px;padding:8px;border-radius:50%;background:#fff;box-shadow:0 4px 14px rgba(8,35,61,.08);text-align:center}
      .behavior-donut strong{color:#08233d;font-size:27px;font-weight:1000;line-height:1;letter-spacing:-.04em}.behavior-donut small{max-width:95px;color:#536b78;font-size:8px;font-weight:900;line-height:1.35}
      .behavior-visual-delta{padding:13px}.behavior-visual-delta>small{padding:0;color:#617784;font-size:9px;font-weight:1000}.behavior-visual-delta>div{display:grid;grid-template-columns:minmax(0,1fr) 30px minmax(0,1fr);align-items:center;gap:7px;margin-top:12px}
      .behavior-visual-delta span{display:grid;place-items:center;min-height:102px;padding:10px;border-radius:12px;background:#eef4f8;text-align:center}.behavior-visual-delta span:last-child{background:#fff0f1}.behavior-visual-delta b{color:#08233d;font-size:23px;font-weight:1000;letter-spacing:-.04em}.behavior-visual-delta span:last-child b{color:#d31727}.behavior-visual-delta em{color:#627681;font-size:8px;font-style:normal;font-weight:900}.behavior-visual-delta>div>i{color:#d31727;font-size:24px;font-style:normal;font-weight:1000;text-align:center}
      .behavior-detail-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:47px;margin-top:10px;padding:8px 11px;border:1px solid #cbd8e0;border-radius:12px;background:#fff;color:#08233d;font-size:11px;font-weight:1000;text-align:left}.behavior-detail-toggle b{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#eaf1f6;color:#08233d;font-size:16px}.behavior-detail-toggle[aria-expanded="true"]{border-color:#08233d;background:#08233d;color:#fff}.behavior-detail-toggle[aria-expanded="true"] b{background:#fff;color:#d31727}
      .behavior-detail[hidden]{display:none!important}.behavior-detail{margin-top:9px;padding:12px;border-top:4px solid var(--accent);border-radius:12px;background:#f6f9fb}.behavior-observation{margin:0;color:#253f4b;font-size:12px;font-weight:800;line-height:1.7}.behavior-evidence{margin:8px 0 0;padding:6px 9px;border-radius:8px;background:#eaf0f3;color:#61747e;font-size:9px;line-height:1.5}
      .behavior-question{margin-top:10px;padding:10px 11px;border-left:4px solid #d31727;background:#fff1f2}.behavior-question span{color:#b31624;font-size:8px;font-weight:1000}.behavior-question p{margin:4px 0 0;color:#08233d;font-size:12px;font-weight:1000;line-height:1.55}
      .behavior-feedback{display:grid;grid-template-columns:1fr;gap:6px;margin-top:10px}.behavior-feedback button{min-height:44px;padding:8px 10px;border:1px solid #cbd7dd;border-radius:10px;background:#fff;color:#405863;font-size:10px;font-weight:900;line-height:1.35}.behavior-feedback button.selected{border-color:#08233d;background:#08233d;color:#fff}.behavior-feedback-status{display:block;margin-top:6px;color:#718188;font-size:8px}
      .behavior-insight-empty{padding:15px;border:1px solid #dce5e7;border-radius:15px;background:#f7fafa}.behavior-insight-empty b{color:#08233d;font-size:14px}.behavior-insight-empty p{margin:5px 0 0;color:#63767d;font-size:10px;line-height:1.65}
      .behavior-next-tier{padding:12px 13px;border:1px dashed #c9a653;border-radius:14px;background:#fffaf0}.behavior-next-tier span{display:block;color:#90701d;font-size:8px;font-weight:1000}.behavior-next-tier b{display:block;margin-top:2px;color:#08233d;font-size:12px}.behavior-next-tier p{margin:4px 0 0;color:#65767d;font-size:9px;line-height:1.55}.behavior-method-note{padding:4px 3px;color:#74848a;font-size:8px;line-height:1.55}
      @media(max-width:390px){.behavior-insight-intro{grid-template-columns:minmax(0,1fr) 78px}.behavior-insight-intro img{width:80px;height:76px}.behavior-insight h3{font-size:19px}.behavior-chart-bars{gap:14px;height:150px;margin:0 9px}.behavior-chart-column strong{font-size:22px}.behavior-donut{width:150px;height:150px}.behavior-donut>span{width:106px;height:106px}.behavior-visual-donut{min-height:190px}.behavior-feedback button{min-height:44px}}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    styles();
    render();
    document.addEventListener("click", onFeedback, false);
    window.addEventListener("mamo:analysis-rendered", render);
    window.addEventListener("mamo:decision-journey-updated", render);
    window.addEventListener("pageshow", render);
    window.addEventListener("storage", (event) => {
      if ([APP_KEY, RECORD_KEY, JOURNEY_KEY].includes(event.key)) render();
    });
  }

  window.MAMO_BEHAVIOR_INSIGHTS_V2 = Object.freeze({ version: 2, build: buildModel, visible: visibleInsights, render });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();

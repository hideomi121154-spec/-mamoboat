from pathlib import Path

path = Path('tests/air-bet-review-flow.test.js')
text = path.read_text(encoding='utf-8')
old = '''    openReview();
    click(".air-bet-confirm-button");
    const saved = JSON.parse(window.localStorage.getItem("mamoboat_v40_personal"));
    assert.equal(saved.coins, 99900, "wallet debit must happen only on final confirmation");
    assert.equal(saved.records.length, 1, "history must be written only on final confirmation");
    assert.equal(saved.records[0].lines.length, 1);
    assert.equal(status().count, 0, "confirmed draft must be reset");
'''
new = '''    openReview();
    click('[data-mamo-review-continue="1"]');
    const finalConfirm = window.document.querySelector('.air-bet-confirm-button');
    assert(finalConfirm, "final AIR BET button must remain in the canonical review shell");
    assert.equal(finalConfirm.disabled, true, "SELF CHECK must be complete before final AIR BET confirmation");

    click('[data-mamo-self-confidence="4"]');
    const basis = window.document.querySelector('[data-mamo-self-basis="1"]');
    basis.value = "motor";
    basis.dispatchEvent(new window.Event("change", { bubbles: true }));
    const stakeFeeling = window.document.querySelector('[data-mamo-self-stake-feeling="1"]');
    stakeFeeling.value = "appropriate";
    stakeFeeling.dispatchEvent(new window.Event("change", { bubbles: true }));
    click('[data-mamo-real-same="no"]');
    assert.equal(finalConfirm.disabled, false, "all four SELF CHECK answers must enable final confirmation");

    click(".air-bet-confirm-button");
    const saved = JSON.parse(window.localStorage.getItem("mamoboat_v40_personal"));
    assert.equal(saved.coins, 99900, "wallet debit must happen only on final confirmation");
    assert.equal(saved.records.length, 1, "history must be written only on final confirmation");
    assert.equal(saved.records[0].lines.length, 1);
    assert.equal(saved.records[0].selfCheckVersion, 1);
    assert.equal(saved.records[0].selfConfidence, 4);
    assert.equal(saved.records[0].selfBasis, "motor");
    assert.equal(saved.records[0].selfStakeFeeling, "appropriate");
    assert.equal(saved.records[0].selfRealSameAmount, "no");
    assert.equal(status().count, 0, "confirmed draft must be reset");
'''
assert old in text, 'final confirmation test block not found'
path.write_text(text.replace(old, new, 1), encoding='utf-8')

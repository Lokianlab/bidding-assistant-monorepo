import { describe, it, expect } from 'vitest';
import { buildYearlyAnalysis, buildCompetitorsByCategory } from '@/lib/intelligence/yearly-analysis';
import type { AgencyCase } from '@/lib/intelligence/types';

function makeCase(overrides: Partial<AgencyCase> = {}): AgencyCase {
  return {
    job_number: 'JOB-001',
    title: '展覽活動案',
    award_date: '2025/03/01',
    award_amount: 500_000,
    winner_name: '甲公司',
    winner_id: 'A001',
    bidder_count: 3,
    category: '展覽策展',
    all_bidder_names: ['甲公司', '乙公司', '丙公司'],
    ...overrides,
  };
}

describe('buildYearlyAnalysis', () => {
  it('returns empty arrays for all groups when input is empty', () => {
    const result = buildYearlyAnalysis([]);
    expect(result.total).toEqual([]); expect(result.single).toEqual([]); expect(result.two).toEqual([]); expect(result.multi).toEqual([]);
  });

  it('total includes all cases regardless of bidder_count', () => {
    const cases = [makeCase({ bidder_count: 1 }), makeCase({ bidder_count: 2 }), makeCase({ bidder_count: 5 })];
    expect(buildYearlyAnalysis(cases).total.reduce((s, r) => s + r.count, 0)).toBe(3);
  });

  it('single filters only bidder_count === 1', () => {
    const cases = [makeCase({ bidder_count: 1, category: '展覽策展' }), makeCase({ bidder_count: 2, category: '展覽策展' }), makeCase({ bidder_count: 1, category: '展覽策展' })];
    const r = buildYearlyAnalysis(cases);
    expect(r.single.reduce((s, x) => s + x.count, 0)).toBe(2); expect(r.two.reduce((s, x) => s + x.count, 0)).toBe(1); expect(r.multi.reduce((s, x) => s + x.count, 0)).toBe(0);
  });

  it('multi filters bidder_count >= 3', () => {
    expect(buildYearlyAnalysis([makeCase({ bidder_count: 3 }), makeCase({ bidder_count: 4 }), makeCase({ bidder_count: 2 })]).multi.reduce((s, r) => s + r.count, 0)).toBe(2);
  });

  it('extracts year from YYYY/MM/DD format', () => {
    expect(buildYearlyAnalysis([makeCase({ award_date: '2024/06/15' })]).total[0].year).toBe(2024);
  });

  it('extracts year from YYYYMMDD compact format', () => {
    expect(buildYearlyAnalysis([makeCase({ award_date: '20230915' })]).total[0].year).toBe(2023);
  });

  it('aggregates same year and category together', () => {
    const cases = [makeCase({ award_date: '2025/01/01', category: '展覽策展', award_amount: 100_000 }), makeCase({ award_date: '2025/06/01', category: '展覽策展', award_amount: 200_000 })];
    const r = buildYearlyAnalysis(cases).total;
    expect(r).toHaveLength(1); expect(r[0].count).toBe(2); expect(r[0].award_total).toBe(300_000);
  });

  it('keeps different categories separate in same year', () => {
    const cases = [makeCase({ award_date: '2025/01/01', category: '展覽策展' }), makeCase({ award_date: '2025/01/01', category: '活動辦理' })];
    expect(buildYearlyAnalysis(cases).total).toHaveLength(2);
  });

  it('keeps different years separate for same category', () => {
    const cases = [makeCase({ award_date: '2024/01/01', category: '展覽策展' }), makeCase({ award_date: '2025/01/01', category: '展覽策展' })];
    expect(buildYearlyAnalysis(cases).total).toHaveLength(2);
  });

  it('sorts by year descending', () => {
    const cases = [makeCase({ award_date: '2023/01/01', category: '展覽策展' }), makeCase({ award_date: '2025/01/01', category: '展覽策展' }), makeCase({ award_date: '2024/01/01', category: '展覽策展' })];
    const r = buildYearlyAnalysis(cases).total;
    expect(r[0].year).toBe(2025); expect(r[1].year).toBe(2024); expect(r[2].year).toBe(2023);
  });

  it('award_total stays null when all amounts are null', () => {
    const cases = [makeCase({ award_amount: null, category: '展覽策展', award_date: '2025/01/01' }), makeCase({ award_amount: null, category: '展覽策展', award_date: '2025/02/01' })];
    expect(buildYearlyAnalysis(cases).total[0].award_total).toBeNull();
  });

  it('accumulates award_total for non-null amounts only', () => {
    const cases = [makeCase({ award_amount: 300_000, category: '展覽策展', award_date: '2025/01/01' }), makeCase({ award_amount: null, category: '展覽策展', award_date: '2025/02/01' })];
    const r = buildYearlyAnalysis(cases).total[0];
    expect(r.award_total).toBe(300_000); expect(r.count).toBe(2);
  });

  it('budget_total is always null', () => {
    expect(buildYearlyAnalysis([makeCase()]).total[0].budget_total).toBeNull();
  });

  it('skips cases with invalid award_date', () => {
    const cases = [makeCase({ award_date: 'invalid', category: '展覽策展' }), makeCase({ award_date: '2025/01/01', category: '展覽策展' })];
    const r = buildYearlyAnalysis(cases).total;
    expect(r).toHaveLength(1); expect(r[0].year).toBe(2025);
  });

  it('bidder_count 0 not in single/two/multi, is in total', () => {
    const r = buildYearlyAnalysis([makeCase({ bidder_count: 0 })]);
    expect(r.single).toHaveLength(0); expect(r.two).toHaveLength(0); expect(r.multi).toHaveLength(0); expect(r.total).toHaveLength(1);
  });
});

describe('buildCompetitorsByCategory', () => {
  it('returns empty array for empty input', () => {
    expect(buildCompetitorsByCategory([])).toEqual([]);
  });

  it('creates category entry even with no bidder names', () => {
    const r = buildCompetitorsByCategory([makeCase({ all_bidder_names: [], category: '展覽策展' })]);
    expect(r).toHaveLength(1); expect(r[0].top_competitors).toHaveLength(0);
  });

  it('counts encounter_count per bidder per category', () => {
    const cases = [makeCase({ category: '展覽策展', all_bidder_names: ['甲公司', '乙公司'], winner_name: '甲公司' }), makeCase({ category: '展覽策展', all_bidder_names: ['甲公司', '丙公司'], winner_name: '甲公司' })];
    const r = buildCompetitorsByCategory(cases);
    const jia = r[0].top_competitors.find((c) => c.name === '甲公司');
    expect(jia?.encounter_count).toBe(2); expect(jia?.win_count).toBe(2);
    const yi = r[0].top_competitors.find((c) => c.name === '乙公司');
    expect(yi?.encounter_count).toBe(1); expect(yi?.win_count).toBe(0);
  });

  it('sorts competitors by encounter_count descending', () => {
    const cases = [makeCase({ category: '展覽策展', all_bidder_names: ['甲公司'], winner_name: '甲公司' }), makeCase({ category: '展覽策展', all_bidder_names: ['甲公司'], winner_name: '甲公司' }), makeCase({ category: '展覽策展', all_bidder_names: ['乙公司'], winner_name: '乙公司' })];
    const r = buildCompetitorsByCategory(cases);
    expect(r[0].top_competitors[0].name).toBe('甲公司'); expect(r[0].top_competitors[0].encounter_count).toBe(2);
  });

  it('limits top_competitors to 8 entries', () => {
    const names = Array.from({ length: 12 }, (_, i) => "廠商" + String(i));
    const cases = names.map((name) => makeCase({ category: '展覽策展', all_bidder_names: [name], winner_name: name }));
    expect(buildCompetitorsByCategory(cases)[0].top_competitors.length).toBeLessThanOrEqual(8);
  });

  it('separates competitors by category', () => {
    const cases = [makeCase({ category: '展覽策展', all_bidder_names: ['甲公司'] }), makeCase({ category: '活動辦理', all_bidder_names: ['乙公司'] })];
    const r = buildCompetitorsByCategory(cases);
    expect(r).toHaveLength(2); expect(r.map((x) => x.category)).toContain('展覽策展');
  });

  it('sorts categories by total_cases descending', () => {
    const cases = [makeCase({ category: '展覽策展', all_bidder_names: ['甲公司'] }), makeCase({ category: '活動辦理', all_bidder_names: ['乙公司'] }), makeCase({ category: '活動辦理', all_bidder_names: ['丙公司'] })];
    const r = buildCompetitorsByCategory(cases);
    expect(r[0].category).toBe('活動辦理'); expect(r[0].total_cases).toBe(2);
  });

  it('skips empty bidder names', () => {
    const cases = [makeCase({ category: '展覽策展', all_bidder_names: ['', '甲公司', ''] })];
    const r = buildCompetitorsByCategory(cases);
    expect(r[0].top_competitors).toHaveLength(1); expect(r[0].top_competitors[0].name).toBe('甲公司');
  });

  it('win_count is 0 when bidder never won', () => {
    const cases = [makeCase({ category: '展覽策展', all_bidder_names: ['甲公司', '乙公司'], winner_name: '甲公司' })];
    const yi = buildCompetitorsByCategory(cases)[0].top_competitors.find((c) => c.name === '乙公司');
    expect(yi?.win_count).toBe(0);
  });
});

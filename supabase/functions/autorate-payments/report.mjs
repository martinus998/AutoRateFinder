// An educational review of figures supplied by the customer. No insurer rates are inferred.
export function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('invalid_profile');
  const str = (key, max = 60) => String(raw[key] ?? '').trim().slice(0, max);
  const money = (key, min, max) => {
    const n = Number(raw[key]);
    if (!Number.isFinite(n) || n < min || n > max || Math.abs(Math.round(n * 100) - n * 100) > 0.00001) throw new Error('invalid_profile');
    return n;
  };
  const state = str('state', 2).toUpperCase();
  const states = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ');
  const zip = str('zip', 5);
  const year = Number(raw.vehicleYear);
  const vehicleMake = str('vehicleMake', 40);
  const vehicleModel = str('vehicleModel', 40);
  if (!states.includes(state) || !/^\d{5}$/.test(zip) || !Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 1 || !vehicleMake || !vehicleModel) throw new Error('invalid_profile');
  const monthlyPremium = money('monthlyPremium', 1, 3000);
  const deductible = money('deductible', 0, 10000);
  const secondPremium = raw.secondPremium === '' || raw.secondPremium == null ? null : money('secondPremium', 1, 3000);
  const secondDeductible = raw.secondDeductible === '' || raw.secondDeductible == null ? null : money('secondDeductible', 0, 10000);
  if ((secondPremium === null) !== (secondDeductible === null)) throw new Error('invalid_profile');
  const coverage = str('coverage', 16);
  if (!['liability', 'full', 'unknown'].includes(coverage)) throw new Error('invalid_profile');
  const extras = Array.isArray(raw.extras) ? raw.extras.filter(x => ['collision', 'comprehensive', 'rental', 'roadside'].includes(x)) : [];
  return { state, zip, vehicleYear: year, vehicleMake, vehicleModel, monthlyPremium, deductible, coverage, extras: [...new Set(extras)], secondPremium, secondDeductible };
}

export function buildReport(p) {
  const usd = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const annual = p.monthlyPremium * 12;
  const observations = [
    `At the monthly premium you entered, 12 months would total ${usd(annual)}, before any changes or fees. Confirm the quote term and payment schedule.`,
    `The deductible you entered is ${usd(p.deductible)}. Confirm which coverages it applies to and what you would pay after a covered claim.`
  ];
  if (p.coverage === 'liability') observations.push('You marked this as liability-only. Ask whether damage to your own car is included; do not assume it is.');
  if (p.coverage === 'full') observations.push('“Full coverage” is an informal label. Check the exact liability limits and whether collision and comprehensive are included.');
  if (p.coverage === 'unknown') observations.push('Coverage type was not specified. Request the declarations or quote summary before comparing prices.');
  if (!p.extras.includes('rental')) observations.push('Rental reimbursement was not selected in your inputs. Ask whether it is offered and what limits apply.');
  if (p.secondPremium !== null) {
    const difference = Math.abs(p.monthlyPremium - p.secondPremium);
    const cheaper = p.monthlyPremium === p.secondPremium ? 'The two entered monthly premiums are equal.' : `${p.monthlyPremium < p.secondPremium ? 'Your first' : 'Your second'} entered price is ${usd(difference)} per month lower (${usd(difference * 12)} over 12 months).`;
    observations.push(`${cheaper} Compare the same term, liability limits, exclusions and deductible before treating that as savings.`);
    if (p.deductible !== p.secondDeductible) observations.push(`The deductibles differ (${usd(p.deductible)} versus ${usd(p.secondDeductible)}), so the prices are not directly comparable.`);
  }
  return {
    title: `${p.vehicleYear} ${p.vehicleMake} ${p.vehicleModel} · ${p.state} ${p.zip}`,
    monthly: usd(p.monthlyPremium), annual: usd(annual), deductible: usd(p.deductible),
    secondMonthly: p.secondPremium === null ? null : usd(p.secondPremium),
    observations,
    questions: [
      'What are the bodily injury and property damage liability limits on this exact quote?',
      'What fees or discounts change the total if I pay monthly versus for the full policy term?',
      'Which coverages share this deductible, and what exclusions or waiting periods apply?',
      `What discounts do I qualify for on this ${p.vehicleYear} ${p.vehicleMake} ${p.vehicleModel}, and how will you verify them?`
    ],
    checklist: ['Get the written quote or declarations page.', 'Compare identical policy terms, limits and deductibles.', 'Check the insurer or agent license with the state insurance department.', 'Confirm the final premium directly with the insurer or licensed agent.'],
    disclosure: 'Educational review of your own entries. This is not an insurer quote, a guarantee of savings, or a recommendation to buy, change, or cancel a policy.'
  };
}

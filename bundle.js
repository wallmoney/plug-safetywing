const STORAGE_KEY = 'insurance-state';
const COUNTRY_MAP_URL = 'https://safetywing.com/nomad-care-map';

const PLANS = {
  essential: {
    id: 'essential',
    name: 'Nomad Insurance Essential',
    shortName: 'Essential',
    icon: '🩹',
    description: 'Travel medical insurance for unexpected issues abroad.',
    coverageLimit: '$250,000',
    countries: '180+ countries',
    homeCoverage: 'Up to 30 days per stay for every 90 days of coverage (15 days for US)',
    officialUrl: 'https://safetywing.com/nomad-insurance?selectedPlan=NOMAD_INSURANCE_ESSENTIAL',
    reference: 'safetywing-essential'
  },
  complete: {
    id: 'complete',
    name: 'Nomad Insurance Complete',
    shortName: 'Complete',
    icon: '🛡️',
    description: 'Full health insurance with broader care and travel protections.',
    coverageLimit: '$1,500,000',
    countries: '170+ countries',
    homeCoverage: 'Fully covered',
    officialUrl: 'https://safetywing.com/nomad-insurance?selectedPlan=NOMAD_INSURANCE_COMPLETE',
    reference: 'safetywing-complete'
  }
};

const AGE_BANDS = [
  { id: 'under10', label: 'Under 10', icon: '🧒', essential4w: 31.36, completeMonth: 88.75 },
  { id: '10-39', label: '10-39', icon: '🧭', essential4w: 62.72, completeMonth: 177.5 },
  { id: '40-49', label: '40-49', icon: '🧳', essential4w: 104.44, completeMonth: 244.5 },
  { id: '50-59', label: '50-59', icon: '🌤️', essential4w: 166.24, completeMonth: 319.25 },
  { id: '60-69', label: '60-69', icon: '🌍', essential4w: 227.36, completeMonth: 416.5 }
];

const ESSENTIAL_US_ADDON_4W = {
  '10-39': 53.48,
  '40-49': 88.48,
  '50-59': 153.44,
  '60-69': 210.56
};

const COMPLETE_HK_SG_US_ADDON_MONTHLY = {
  '10-39': 131.0,
  '40-49': 195.0,
  '50-59': 304.0,
  '60-69': 560.0
};

const COUNTRIES = [
  ['🇦🇱', 'Albania'], ['🇦🇩', 'Andorra'], ['🇦🇷', 'Argentina'], ['🇦🇺', 'Australia'],
  ['🇦🇹', 'Austria'], ['🇧🇸', 'Bahamas'], ['🇧🇪', 'Belgium'], ['🇧🇷', 'Brazil'],
  ['🇧🇬', 'Bulgaria'], ['🇨🇦', 'Canada'], ['🇨🇱', 'Chile'], ['🇨🇳', 'China'],
  ['🇨🇴', 'Colombia'], ['🇨🇷', 'Costa Rica'], ['🇭🇷', 'Croatia'], ['🇨🇾', 'Cyprus'],
  ['🇨🇿', 'Czechia'], ['🇩🇰', 'Denmark'], ['🇩🇴', 'Dominican Republic'], ['🇪🇨', 'Ecuador'],
  ['🇪🇪', 'Estonia'], ['🇫🇮', 'Finland'], ['🇫🇷', 'France'], ['🇬🇪', 'Georgia'],
  ['🇩🇪', 'Germany'], ['🇬🇷', 'Greece'], ['🇭🇰', 'Hong Kong'], ['🇭🇺', 'Hungary'],
  ['🇮🇸', 'Iceland'], ['🇮🇩', 'Indonesia'], ['🇮🇪', 'Ireland'], ['🇮🇱', 'Israel'],
  ['🇮🇹', 'Italy'], ['🇯🇵', 'Japan'], ['🇰🇷', 'South Korea'], ['🇱🇻', 'Latvia'],
  ['🇱🇹', 'Lithuania'], ['🇱🇺', 'Luxembourg'], ['🇲🇹', 'Malta'], ['🇲🇽', 'Mexico'],
  ['🇲🇪', 'Montenegro'], ['🇲🇦', 'Morocco'], ['🇳🇱', 'Netherlands'], ['🇳🇿', 'New Zealand'],
  ['🇳🇴', 'Norway'], ['🇵🇦', 'Panama'], ['🇵🇪', 'Peru'], ['🇵🇭', 'Philippines'],
  ['🇵🇱', 'Poland'], ['🇵🇹', 'Portugal'], ['🇷🇴', 'Romania'], ['🇷🇸', 'Serbia'],
  ['🇸🇬', 'Singapore'], ['🇸🇰', 'Slovakia'], ['🇸🇮', 'Slovenia'], ['🇿🇦', 'South Africa'],
  ['🇪🇸', 'Spain'], ['🇸🇪', 'Sweden'], ['🇨🇭', 'Switzerland'], ['🇹🇼', 'Taiwan'],
  ['🇹🇭', 'Thailand'], ['🇹🇷', 'Turkey'], ['🇦🇪', 'United Arab Emirates'], ['🇬🇧', 'United Kingdom'],
  ['🇺🇸', 'United States'], ['🇺🇾', 'Uruguay'], ['🇻🇳', 'Vietnam']
];

function defaultState() {
  return {
    step: 1,
    plan: 'essential',
    term: '4w',
    age: '10-39',
    region: 'standard',
    member: {
      name: '',
      email: '',
      residence: ''
    },
    countryQuery: '',
    status: 'draft',
    planName: '',
    activeUntil: '',
    updatedAt: null
  };
}

function clampStep(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(4, Math.round(n)));
}

function nextState(state, patch) {
  return Object.assign({}, state, patch, {
    member: Object.assign({}, state.member, patch && patch.member ? patch.member : {}),
    updatedAt: patch && typeof patch.updatedAt === 'string' ? patch.updatedAt : state.updatedAt
  });
}

function normalizeState(raw) {
  return nextState(defaultState(), Object.assign({}, raw || {}, {
    step: clampStep(raw && raw.step),
    member: Object.assign(defaultState().member, raw && raw.member ? raw.member : {})
  }));
}

function updateState(hostApi, patch) {
  const state = normalizeState(hostApi.storage.get(STORAGE_KEY));
  const next = nextState(state, patch);
  hostApi.storage.set(STORAGE_KEY, next);
  return next;
}

function ageConfig(state) {
  return AGE_BANDS.find((age) => age.id === state.age) || AGE_BANDS[1];
}

function ageOptionsForPlan(planId) {
  if (planId === 'complete') {
    return AGE_BANDS.filter((age) => age.id !== 'under10').map((age) => ({
      id: age.id,
      label: age.id === '10-39' ? '18-39' : age.id === '60-69' ? '60-64' : age.label,
      icon: age.icon,
      essential4w: age.essential4w,
      completeMonth: age.completeMonth
    }));
  }
  return AGE_BANDS.filter((age) => age.id !== 'under10');
}

function availableTerms(state) {
  return state.plan === 'essential'
    ? [
        { id: '4w', label: '4 weeks', helper: 'Flexible coverage', icon: '🗓️' }
      ].concat(state.age === 'under10'
        ? []
        : [
            { id: '364d', label: '364 days', helper: 'Pay in full • Save 10%', icon: '📅' }
          ])
    : [
        { id: 'monthly', label: 'Monthly', helper: 'Rolling monthly cover', icon: '🗓️' },
        { id: 'yearly', label: 'Yearly', helper: 'Pay yearly • Save 10%', icon: '📅' }
      ];
}

function regionAddonBase(state) {
  if (state.plan === 'essential') {
    return ESSENTIAL_US_ADDON_4W[state.age] || 0;
  }
  return COMPLETE_HK_SG_US_ADDON_MONTHLY[state.age] || 0;
}

function regionAddonPrice(state) {
  const base = regionAddonBase(state);
  if (!base) return 0;
  if (state.plan === 'essential') {
    return state.region === 'us' ? (state.term === '364d' ? base * 13 * 0.9 : base) : 0;
  }
  return state.region === 'hksgus' ? (state.term === 'yearly' ? base * 12 * 0.9 : base) : 0;
}

function regionOptions(state) {
  if (state.plan === 'essential') {
    return [
      { id: 'standard', label: 'Worldwide excluding US', helper: 'Base cover', icon: '🌍' }
    ].concat(regionAddonBase(state)
      ? [
          {
            id: 'us',
            label: 'US coverage',
            helper: `${formatMoney(regionAddonBase(state))} extra price`,
            icon: '🗽',
            badge: 'Add-on'
          }
        ]
      : []);
  }
  return [
    { id: 'standard', label: 'Standard worldwide', helper: 'HK, Singapore, and US excluded', icon: '🌐' },
    {
      id: 'hksgus',
      label: 'Hong Kong, Singapore & US',
      helper: `${formatMoney(regionAddonBase(state))} extra price`,
      icon: '✈️',
      badge: 'Add-on'
    }
  ];
}

function priceFor(state) {
  const age = ageConfig(state);
  if (state.plan === 'essential') {
    return (state.term === '364d' ? age.essential4w * 13 * 0.9 : age.essential4w) + regionAddonPrice(state);
  }
  return (state.term === 'yearly' ? age.completeMonth * 12 * 0.9 : age.completeMonth) + regionAddonPrice(state);
}

function periodFor(state) {
  if (state.plan === 'essential') return state.term === '364d' ? '364 days' : '4 weeks';
  return state.term === 'yearly' ? 'year' : 'month';
}

function activePeriodLabel(state) {
  if (state.plan === 'essential') return state.term === '364d' ? '364 days' : '4 weeks';
  return state.term === 'yearly' ? '12 months' : '1 month';
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function addCoveragePeriod(value, state) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  if (state.plan === 'essential' && state.term === '364d') {
    date.setUTCDate(date.getUTCDate() + 364);
  } else if (state.plan === 'essential') {
    date.setUTCDate(date.getUTCDate() + 28);
  } else if (state.term === 'yearly') {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  } else {
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return date.toISOString().slice(0, 10);
}

function stateAction(state, patch, message) {
  return {
    type: 'storage',
    key: STORAGE_KEY,
    value: nextState(state, patch),
    message: message || undefined,
    level: message ? 'success' : undefined
  };
}

function stateButton(state, label, patch, variant, message) {
  return {
    label,
    variant,
    action: stateAction(state, patch, message)
  };
}

function planPatch(planId) {
  return {
    plan: planId,
    age: '10-39',
    term: planId === 'essential' ? '4w' : 'monthly',
    region: 'standard'
  };
}

function annualDiscount(state) {
  if (state.plan === 'essential') return state.term === '364d';
  return state.term === 'yearly';
}

function billingSummary(state) {
  const term = availableTerms(state).find((item) => item.id === state.term);
  return term ? `${term.label}${term.helper ? ` • ${term.helper}` : ''}` : activePeriodLabel(state);
}

function normalizeCoverageState(state) {
  let next = state;
  const ageOptions = ageOptionsForPlan(next.plan);
  if (!ageOptions.some((age) => age.id === next.age)) {
    next = nextState(next, { age: ageOptions[0].id });
  }
  const termOptions = availableTerms(next);
  if (!termOptions.some((term) => term.id === next.term)) {
    next = nextState(next, { term: termOptions[0].id });
  }
  const regions = regionOptions(next);
  if (!regions.some((region) => region.id === next.region)) {
    next = nextState(next, { region: regions[0].id });
  }
  return next;
}

function navigationButtons(state, options) {
  const current = clampStep(state.step);
  const nextLabel = options && options.nextLabel ? options.nextLabel : 'Next';
  const previous = current > 1 ? [stateButton(state, '← Previous', { step: current - 1 }, 'secondary')] : [];
  const next = current < 4 ? [stateButton(state, nextLabel, { step: current + 1 }, 'primary')] : [];
  return {
    type: 'buttonRow',
    buttons: previous.concat(next)
  };
}

function summaryBadges(state) {
  const normalized = normalizeCoverageState(state);
  const plan = PLANS[normalized.plan];
  const region = regionOptions(normalized).find((item) => item.id === normalized.region) || regionOptions(normalized)[0];
  const ageLabel = ageOptionsForPlan(normalized.plan).find((age) => age.id === normalized.age).label;
  return {
    type: 'badgeGrid',
    items: [
      { label: 'Geographic coverage', value: plan.countries, tone: 'muted' },
      { label: 'Coverage at home', value: plan.homeCoverage, tone: 'muted' },
      { label: 'Selected age', value: ageLabel, tone: 'muted' },
      { label: 'Selected billing', value: billingSummary(normalized), tone: annualDiscount(normalized) ? 'success' : 'muted' },
      { label: 'Extra cover', value: region.helper, tone: region.id === 'standard' ? 'muted' : 'warning' },
      { label: 'Discount', value: annualDiscount(normalized) ? '10% applied' : 'No annual discount', tone: annualDiscount(normalized) ? 'success' : 'muted' }
    ]
  };
}

function summaryList(state) {
  const normalized = normalizeCoverageState(state);
  const plan = PLANS[normalized.plan];
  const region = regionOptions(normalized).find((item) => item.id === normalized.region) || regionOptions(normalized)[0];
  const ageLabel = ageOptionsForPlan(normalized.plan).find((age) => age.id === normalized.age).label;
  return {
    type: 'list',
    items: [
      { label: 'Plan', value: plan.name },
      { label: 'Age', value: ageLabel },
      { label: 'Billing', value: billingSummary(normalized) },
      { label: 'Region', value: region.label },
      { label: 'Total', value: `${formatMoney(priceFor(normalized))} / ${periodFor(normalized)}` }
    ]
  };
}

function normalizeCountryName(value) {
  const normalized = value.trim().toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
  if (['us', 'usa', 'u s', 'u s a', 'america', 'united states of america'].includes(normalized)) return 'United States';
  if (['uk', 'u k', 'great britain', 'england'].includes(normalized)) return 'United Kingdom';
  if (['south korea', 'korea'].includes(normalized)) return 'South Korea';
  if (['uae'].includes(normalized)) return 'United Arab Emirates';
  if (['hongkong', 'hong kong'].includes(normalized)) return 'Hong Kong';
  return value.trim();
}

function findCountry(query) {
  const country = normalizeCountryName(query);
  if (!country) return null;
  const normalized = country.toLowerCase();
  const exact = COUNTRIES.find((item) => item[1].toLowerCase() === normalized);
  if (exact) return exact;
  return COUNTRIES.find((item) => item[1].toLowerCase().includes(normalized)) || null;
}

function countryStatus(country, state) {
  if (country === 'United States') {
    if (state.plan === 'essential') {
      return state.region === 'us'
        ? { value: 'Covered with US add-on', tone: 'warning' }
        : { value: 'Not included in base cover', tone: 'danger' };
    }
    return state.region === 'hksgus'
      ? { value: 'Covered with add-on', tone: 'warning' }
      : { value: 'Requires add-on', tone: 'danger' };
  }
  if (state.plan === 'complete' && (country === 'Hong Kong' || country === 'Singapore')) {
    return state.region === 'hksgus'
      ? { value: 'Covered with add-on', tone: 'warning' }
      : { value: 'Requires add-on', tone: 'danger' };
  }
  return {
    value: state.plan === 'complete' ? 'Covered' : 'Available',
    tone: 'success'
  };
}

function countryResultNode(state) {
  const query = state.countryQuery.trim();
  if (!query) {
    return {
      type: 'text',
      text: 'Search one country at a time to see whether the selected plan covers it, needs an add-on, or should be confirmed on the official SafetyWing map.',
      tone: 'muted'
    };
  }

  const match = findCountry(query);
  if (!match) {
    return {
      type: 'text',
      text: `🔎 ${query} is not in this plugin sample list. Use the official SafetyWing country map below for the live result before payment.`,
      tone: 'warning'
    };
  }

  const flag = match[0];
  const country = match[1];
  const status = countryStatus(country, state);
  const notes = [];

  if (country === 'United States') {
    notes.push('Essential excludes the US from base cover. Add the US option to include it, with a 15-day US home-country limit.');
    notes.push('Complete also needs the HK, Singapore, and US add-on for United States coverage.');
  } else if (country === 'Hong Kong' || country === 'Singapore') {
    notes.push('Complete excludes this country from standard cover. Use the HK, Singapore, and US add-on if SafetyWing includes it in your quote.');
  } else if (state.plan === 'essential') {
    notes.push('Essential home-country stays are limited to 30 days for every 90 days of active coverage.');
  } else {
    notes.push('No special limitation is flagged in this sample list. Confirm the final terms on SafetyWing before payment.');
  }

  return {
    type: 'stack',
    gap: 'sm',
    children: [
      {
        type: 'badgeGrid',
        items: [{ label: `${flag} ${country}`, value: status.value, tone: status.tone }]
      }
    ].concat(notes.map((note) => ({ type: 'text', text: note, tone: status.tone })))
  };
}

function renderPlanSelection(state) {
  const normalized = normalizeCoverageState(state);
  const plan = PLANS[normalized.plan];
  const price = priceFor(normalized);
  const currentRegion = regionOptions(normalized).find((item) => item.id === normalized.region) || regionOptions(normalized)[0];

  return {
    type: 'section',
    title: 'Step 1: Pricing calculator',
    description: 'Build the quote like the SafetyWing calculator. Pick the plan, age, billing, and extra coverage before moving to country checks. Complete is available for ages 18-64.',
    children: [
      {
        type: 'stat',
        label: 'Total cost in USD',
        value: `${formatMoney(price)} / ${periodFor(normalized)}`,
        helper: `${plan.coverageLimit} coverage limit • ${currentRegion.label}${annualDiscount(normalized) ? ' • 10% annual discount included' : ''}`
      },
      {
        type: 'choiceGroup',
        columns: 'two',
        options: Object.keys(PLANS).map((planId) => {
          const item = PLANS[planId];
          return {
            label: item.shortName,
            value: item.description,
            helper: item.coverageLimit,
            icon: item.icon,
            selected: normalized.plan === planId,
            action: stateAction(normalized, planPatch(planId))
          };
        })
      },
      {
        type: 'choiceGroup',
        columns: 'five',
        options: ageOptionsForPlan(normalized.plan).map((age) => ({
          label: age.label,
          value: normalized.plan === 'essential' ? `${formatMoney(age.essential4w)} / 4 weeks` : `${formatMoney(age.completeMonth)} / month`,
          icon: age.icon,
          selected: normalized.age === age.id,
          action: stateAction(normalized, normalizeCoverageState(nextState(normalized, { age: age.id, region: 'standard' })))
        }))
      },
      {
        type: 'choiceGroup',
        columns: 'two',
        options: availableTerms(normalized).map((term) => ({
          label: term.label,
          value: term.helper,
          helper: term.id === '364d' || term.id === 'yearly' ? 'Annual pricing' : 'Flexible billing',
          icon: term.icon,
          badge: term.id === '364d' || term.id === 'yearly' ? 'Save 10%' : undefined,
          selected: normalized.term === term.id,
          action: stateAction(normalized, { term: term.id })
        }))
      },
      {
        type: 'choiceGroup',
        columns: 'two',
        options: regionOptions(normalized).map((region) => ({
          label: region.label,
          value: region.helper,
          helper: region.id === 'standard' ? 'Base cover' : 'Age-based extra premium',
          icon: region.icon,
          badge: region.badge,
          selected: normalized.region === region.id,
          action: stateAction(normalized, { region: region.id })
        }))
      },
      summaryBadges(normalized),
      {
        type: 'buttonRow',
        buttons: [
          { label: `What ${plan.shortName} covers`, variant: 'secondary', action: { type: 'navigate', href: plan.officialUrl } },
          { label: 'Continue to countries →', variant: 'primary', action: stateAction(normalized, { step: 2 }) }
        ]
      }
    ]
  };
}

function renderCountries(state) {
  const normalized = normalizeCoverageState(state);
  const plan = PLANS[normalized.plan];
  const stayLimit = normalized.plan === 'essential'
    ? 'Essential is worldwide travel coverage, with the US only included when you add US coverage. Home-country stays are limited to 30 days every 90 days of cover, or 15 days for the US.'
    : 'Complete is broader health cover. Hong Kong, Singapore, and the United States require the HK, Singapore, and US add-on.';

  return {
    type: 'section',
    title: 'Step 2: Check a country',
    description: `${plan.shortName} availability updates from your current plan and add-on choices. China is included in the sample list.`,
    children: [
      summaryList(normalized),
      { type: 'text', text: stayLimit, tone: 'success' },
      {
        type: 'search',
        label: 'Country',
        value: normalized.countryQuery,
        placeholder: 'Try China, United States, Hong Kong, Singapore, Portugal…',
        buttonLabel: 'Check country',
        field: 'countryQuery',
        action: stateAction(normalized, {})
      },
      countryResultNode(normalized),
      {
        type: 'buttonRow',
        buttons: [
          { label: 'Open country map', variant: 'secondary', action: { type: 'navigate', href: COUNTRY_MAP_URL } },
          ...navigationButtons(normalized, { nextLabel: 'Continue to account details →' }).buttons
        ]
      }
    ]
  };
}

function renderAccountDetails(state) {
  const normalized = normalizeCoverageState(state);
  return {
    type: 'section',
    title: 'Step 3: Account details',
    description: 'Save the member details for this quote. The plugin keeps the draft locally until you send the transfer from Wall Money.',
    children: [
      summaryList(normalized),
      {
        type: 'form',
        fields: [
          { name: 'member.name', label: 'Full name', placeholder: 'Alex Morgan', value: normalized.member.name },
          { name: 'member.email', label: 'Email', type: 'email', placeholder: 'alex@example.com', value: normalized.member.email },
          { name: 'member.residence', label: 'Residence country', placeholder: 'Portugal', value: normalized.member.residence }
        ],
        submitLabel: 'Save details',
        action: stateAction(normalized, { step: 4 }, 'Details saved')
      },
      navigationButtons(normalized, { nextLabel: 'Continue to transfer →' })
    ]
  };
}

function renderPayment(state) {
  const normalized = normalizeCoverageState(state);
  const plan = PLANS[normalized.plan];
  const price = priceFor(normalized);
  const region = regionOptions(normalized).find((item) => item.id === normalized.region) || regionOptions(normalized)[0];
  const paymentReference = `${plan.reference}-${normalized.term}-${normalized.region}`;

  if (normalized.status === 'active') {
    return {
      type: 'section',
      title: 'Step 4: Coverage prepared',
      description: `Wall Money recorded the payment. Keep the SafetyWing confirmation email and review the final policy wording before travel.`,
      children: [
        {
          type: 'stat',
          label: 'Active until',
          value: normalized.activeUntil || 'Recorded',
          helper: `${plan.name} • ${activePeriodLabel(normalized)}`
        },
        {
          type: 'list',
          items: [
            { label: 'Plan', value: plan.name },
            { label: 'Cost', value: `${formatMoney(price)} / ${periodFor(normalized)}` },
            { label: 'Reference', value: paymentReference },
            { label: 'Member', value: normalized.member.name || 'Not entered' },
            { label: 'Email', value: normalized.member.email || 'Not entered' },
            { label: 'Paid', value: formatDate(normalized.updatedAt) || 'Just now' }
          ]
        },
        {
          type: 'buttonRow',
          buttons: [
            { label: 'Review country map', variant: 'secondary', action: { type: 'navigate', href: COUNTRY_MAP_URL } },
            { label: 'Open plan terms', variant: 'secondary', action: { type: 'navigate', href: plan.officialUrl } }
          ]
        }
      ]
    };
  }

  const buttons = [];
  if (normalized.step > 1) {
    buttons.push({ label: '← Previous', variant: 'secondary', action: stateAction(normalized, { step: 3 }) });
  }
  buttons.push({
    label: 'Prefill transfer',
    variant: 'primary',
    action: {
      type: 'payment',
      request: {
        label: `${plan.name} ${periodFor(normalized)}`,
        amount: price.toFixed(2),
        reference: paymentReference,
        portalTransfer: {
          account: 'safetywing',
          currency: 'USD',
          amount: price.toFixed(2),
          platform: 'platform',
          recurring: normalized.plan === 'complete' || normalized.term === '4w' ? 'monthly' : undefined
        }
      }
    }
  });

  return {
    type: 'section',
    title: 'Step 4: Pay in Wall Money',
    description: 'Prefill the transfer in Wall Money. The plugin will return here and mark the plan active after the payment result comes back.',
    children: [
      {
        type: 'stat',
        label: 'Transfer total',
        value: `${formatMoney(price)} / ${periodFor(normalized)}`,
        helper: `${plan.shortName} • ${region.label}${annualDiscount(normalized) ? ' • 10% annual discount applied' : ''}`
      },
      {
        type: 'list',
        items: [
          { label: 'Reference', value: paymentReference },
          { label: 'Region', value: region.label },
          { label: 'Extra premium', value: region.id === 'standard' ? 'None selected' : 'Quoted by SafetyWing before checkout' },
          { label: 'Member', value: normalized.member.name || 'Not entered yet' },
          { label: 'Email', value: normalized.member.email || 'Not entered yet' }
        ]
      },
      {
        type: 'buttonRow',
        align: 'between',
        buttons
      }
    ]
  };
}

function renderCurrentStep(state) {
  if (state.step === 1) return renderPlanSelection(state);
  if (state.step === 2) return renderCountries(state);
  if (state.step === 3) return renderAccountDetails(state);
  return renderPayment(state);
}

module.exports = {
  default: {
    setup(hostApi) {
      this.hostApi = hostApi;
      this.unsubscribe = hostApi.events.onPaymentExecuted((result) => {
        const state = normalizeState(hostApi.storage.get(STORAGE_KEY));
        const plan = PLANS[state.plan];
        if (result.status === 'executed') {
          updateState(hostApi, {
            status: 'active',
            step: 4,
            planName: plan.name,
            activeUntil: addCoveragePeriod(result.executedAt, state),
            updatedAt: result.executedAt
          });
        } else if (result.status === 'opened') {
          updateState(hostApi, { status: 'payment_pending', step: 4, updatedAt: result.executedAt });
        }
      });
    },

    render() {
      const hostApi = this.hostApi;
      const state = normalizeState(hostApi ? hostApi.storage.get(STORAGE_KEY) : null);

      return {
        title: 'SafetyWing Insurance',
        description: 'Build the quote, check destination coverage, save member details, and prefill the Wall Money transfer.',
        nodes: [
          {
            type: 'stack',
            gap: 'lg',
            children: [
              renderCurrentStep(state)
            ]
          }
        ]
      };
    },

    dispose() {
      if (typeof this.unsubscribe === 'function') this.unsubscribe();
    }
  }
};

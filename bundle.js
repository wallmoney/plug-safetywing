const STORAGE_KEY = 'insurance-state';
const COUNTRY_MAP_URL = 'https://safetywing.com/nomad-care-map';

const PLANS = {
  essential: {
    id: 'essential',
    name: 'Nomad Insurance Essential',
    shortName: 'Essential',
    description: 'Travel medical insurance for new and unexpected issues abroad.',
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
    description: 'Broader health coverage with routine care, wellness support, and cancer treatment.',
    coverageLimit: '$1,500,000',
    countries: '170+ countries',
    homeCoverage: 'Fully covered',
    officialUrl: 'https://safetywing.com/nomad-insurance?selectedPlan=NOMAD_INSURANCE_COMPLETE',
    reference: 'safetywing-complete'
  }
};

const AGE_BANDS = [
  { id: 'under10', label: 'Under 10', essential4w: 31.36, completeMonth: 88.75 },
  { id: '10-39', label: '10-39', essential4w: 62.72, completeMonth: 177.5 },
  { id: '40-49', label: '40-49', essential4w: 104.44, completeMonth: 244.5 },
  { id: '50-59', label: '50-59', essential4w: 166.24, completeMonth: 319.25 },
  { id: '60-69', label: '60-69', essential4w: 227.36, completeMonth: 416.5 }
];

const COUNTRIES = [
  ['🇦🇱', 'Albania'], ['🇦🇩', 'Andorra'], ['🇦🇷', 'Argentina'], ['🇦🇺', 'Australia'],
  ['🇦🇹', 'Austria'], ['🇧🇸', 'Bahamas'], ['🇧🇪', 'Belgium'], ['🇧🇷', 'Brazil'],
  ['🇧🇬', 'Bulgaria'], ['🇨🇦', 'Canada'], ['🇨🇱', 'Chile'], ['🇨🇴', 'Colombia'],
  ['🇨🇷', 'Costa Rica'], ['🇭🇷', 'Croatia'], ['🇨🇾', 'Cyprus'], ['🇨🇿', 'Czechia'],
  ['🇩🇰', 'Denmark'], ['🇩🇴', 'Dominican Republic'], ['🇪🇨', 'Ecuador'], ['🇪🇪', 'Estonia'],
  ['🇫🇮', 'Finland'], ['🇫🇷', 'France'], ['🇬🇪', 'Georgia'], ['🇩🇪', 'Germany'],
  ['🇬🇷', 'Greece'], ['🇭🇰', 'Hong Kong'], ['🇭🇺', 'Hungary'], ['🇮🇸', 'Iceland'],
  ['🇮🇩', 'Indonesia'], ['🇮🇪', 'Ireland'], ['🇮🇱', 'Israel'], ['🇮🇹', 'Italy'],
  ['🇯🇵', 'Japan'], ['🇰🇷', 'South Korea'], ['🇱🇻', 'Latvia'], ['🇱🇹', 'Lithuania'],
  ['🇱🇺', 'Luxembourg'], ['🇲🇹', 'Malta'], ['🇲🇽', 'Mexico'], ['🇲🇪', 'Montenegro'],
  ['🇲🇦', 'Morocco'], ['🇳🇱', 'Netherlands'], ['🇳🇿', 'New Zealand'], ['🇳🇴', 'Norway'],
  ['🇵🇦', 'Panama'], ['🇵🇪', 'Peru'], ['🇵🇭', 'Philippines'], ['🇵🇱', 'Poland'],
  ['🇵🇹', 'Portugal'], ['🇷🇴', 'Romania'], ['🇷🇸', 'Serbia'], ['🇸🇬', 'Singapore'],
  ['🇸🇰', 'Slovakia'], ['🇸🇮', 'Slovenia'], ['🇿🇦', 'South Africa'], ['🇪🇸', 'Spain'],
  ['🇸🇪', 'Sweden'], ['🇨🇭', 'Switzerland'], ['🇹🇼', 'Taiwan'], ['🇹🇭', 'Thailand'],
  ['🇹🇷', 'Turkey'], ['🇦🇪', 'United Arab Emirates'], ['🇬🇧', 'United Kingdom'],
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

function normalizeState(raw) {
  return Object.assign(defaultState(), raw || {}, {
    step: clampStep(raw && raw.step),
    member: Object.assign(defaultState().member, raw && raw.member ? raw.member : {})
  });
}

function ageConfig(state) {
  return AGE_BANDS.find((age) => age.id === state.age) || AGE_BANDS[1];
}

function availableTerms(state) {
  return state.plan === 'essential'
    ? [
        { id: '4w', label: '4 weeks' },
        { id: '364d', label: '364 days', helper: 'Save 10%' }
      ]
    : [
        { id: 'monthly', label: 'Monthly' },
        { id: 'yearly', label: 'Yearly', helper: '12 month commitment' }
      ];
}

function priceFor(state) {
  const age = ageConfig(state);
  if (state.plan === 'essential') {
    return state.term === '364d' ? age.essential4w * 13 * 0.9 : age.essential4w;
  }
  return state.term === 'yearly' ? age.completeMonth * 12 : age.completeMonth;
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

function updateState(hostApi, patch) {
	const state = normalizeState(hostApi.storage.get(STORAGE_KEY));
	const next = nextState(state, patch);
	hostApi.storage.set(STORAGE_KEY, next);
	return next;
}

function nextState(state, patch) {
	return Object.assign({}, state, patch, {
		member: Object.assign({}, state.member, patch && patch.member ? patch.member : {}),
		updatedAt: patch && typeof patch.updatedAt === 'string' ? patch.updatedAt : state.updatedAt
	});
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
    type: 'button',
    label,
    variant,
    action: stateAction(state, patch, message)
  };
}

function planPatch(planId) {
  return {
    plan: planId,
    term: planId === 'essential' ? '4w' : 'monthly',
    region: 'standard'
  };
}

function regionOptions(state) {
  if (state.plan === 'essential') {
    return [
      { id: 'standard', label: 'Worldwide excluding US', helper: 'Base cover' },
      { id: 'us', label: 'Add US coverage', helper: 'Extra premium; 15 day US home-country limit' }
    ];
  }
  return [
    { id: 'standard', label: 'Standard worldwide', helper: 'Hong Kong, Singapore, and US need add-on' },
    { id: 'hksgus', label: 'Add Hong Kong, Singapore & US', helper: 'Extra premium' }
  ];
}

function navigationButtons(state, options) {
  const current = clampStep(state.step);
  const nextLabel = options && options.nextLabel ? options.nextLabel : 'Next';
  const previous = current > 1
    ? [stateButton(state, '← Previous', { step: current - 1 }, 'secondary')]
    : [];
  const next = current < 4
    ? [stateButton(state, nextLabel, { step: current + 1 }, 'primary')]
    : [];
  return {
    type: 'buttonRow',
    buttons: previous.concat(next)
  };
}

function summaryList(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  const region = regionOptions(state).find((item) => item.id === state.region) || regionOptions(state)[0];
  return {
    type: 'list',
    items: [
      { label: '🛡️ Plan', value: plan.name },
      { label: '🎂 Age', value: ageConfig(state).label },
      { label: '🔁 Billing', value: periodFor(state) },
      { label: '🌍 Region', value: region.label },
      { label: '💵 Base cost', value: `${formatMoney(price)} / ${periodFor(state)}` }
    ]
  };
}

function countryStatus(country, state) {
  if (country === 'United States') {
    if (state.plan === 'essential') {
      return state.region === 'us'
        ? { value: 'optional US coverage; 15 day home limit', tone: 'warning' }
        : { value: 'not included in base', tone: 'danger' };
    }
    return state.region === 'hksgus'
      ? { value: 'covered with add-on', tone: 'warning' }
      : { value: 'requires add-on', tone: 'danger' };
  }
  if (state.plan === 'complete' && (country === 'Hong Kong' || country === 'Singapore')) {
    return state.region === 'hksgus'
      ? { value: 'covered with add-on', tone: 'warning' }
      : { value: 'requires add-on', tone: 'danger' };
  }
  return {
    value: state.plan === 'complete' ? 'covered' : 'available',
    tone: 'success'
  };
}

function normalizeCountryName(value) {
  const normalized = value.trim().toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
  if (['us', 'usa', 'u s', 'u s a', 'america', 'united states of america'].includes(normalized)) {
    return 'United States';
  }
  if (['uk', 'u k', 'great britain', 'england'].includes(normalized)) {
    return 'United Kingdom';
  }
  if (['south korea', 'korea'].includes(normalized)) {
    return 'South Korea';
  }
  if (['uae'].includes(normalized)) {
    return 'United Arab Emirates';
  }
  if (['hongkong', 'hong kong'].includes(normalized)) {
    return 'Hong Kong';
  }
  return value.trim();
}

function findCountry(query) {
  const country = normalizeCountryName(query);
  if (!country) return null;
  const normalized = country.toLowerCase();
  const exact = COUNTRIES.find(([, name]) => name.toLowerCase() === normalized);
  if (exact) return exact;
  return COUNTRIES.find(([, name]) => name.toLowerCase().includes(normalized)) || null;
}

function countryResultNode(state) {
  const query = state.countryQuery.trim();
  if (!query) {
    return {
      type: 'text',
      text: 'Search a destination to check whether the selected plan covers it, requires an add-on, or needs the official map.',
      tone: 'muted'
    };
  }

  const match = findCountry(query);
  if (!match) {
    return {
      type: 'stack',
      gap: 'sm',
      children: [
        { type: 'text', text: `🔎 ${query} is not in this plugin sample list. Open the SafetyWing map for the official live country result before payment.`, tone: 'warning' },
        {
          type: 'buttonRow',
          buttons: [
            { label: 'Open official map', variant: 'secondary', action: { type: 'navigate', href: COUNTRY_MAP_URL } }
          ]
        }
      ]
    };
  }

  const [flag, country] = match;
  const status = countryStatus(country, state);
  const notes = [];
  if (country === 'United States') {
    notes.push('Essential excludes US from base cover. You need the US add-on, and US home-country cover is limited to 15 days.');
    notes.push('Complete also needs the HK/SG/US add-on for United States coverage.');
  }
  if (country === 'Hong Kong' || country === 'Singapore') {
    notes.push('Complete excludes this country from standard cover. Use the HK/SG/US add-on if SafetyWing offers it for your quote.');
  }
  if (notes.length === 0 && state.plan === 'essential') {
    notes.push('Essential home-country stays are limited to 30 days per 90 days of cover.');
  }
  if (notes.length === 0) {
    notes.push('No special limitation is marked in this plugin sample. Confirm final terms on the SafetyWing map before payment.');
  }

  return {
    type: 'stack',
    gap: 'sm',
    children: [
      {
        type: 'badgeGrid',
        items: [{ label: `${flag} ${country}`, value: status.value, tone: status.tone }]
      },
      ...notes.map((note) => ({ type: 'text', text: note, tone: status.tone }))
    ]
  };
}

function renderPlanSelection(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  const currentTerm = availableTerms(state).find((term) => term.id === state.term) || availableTerms(state)[0];
  const currentRegion = regionOptions(state).find((region) => region.id === state.region) || regionOptions(state)[0];
  return {
    type: 'section',
    title: '🧮 Step 1: Pricing calculator',
    description: 'Choose plan, age, billing, and region like the SafetyWing calculator. Add-ons that SafetyWing quotes separately are marked before payment.',
    children: [
      {
        type: 'stat',
        label: 'Total cost in USD',
        value: `${formatMoney(price)} / ${periodFor(state)}`,
        helper: `${plan.coverageLimit} coverage limit • ${currentRegion.label}${currentRegion.id === 'standard' ? '' : ' • extra premium may apply'}`
      },
      {
        type: 'select',
        label: 'Select plan',
        value: state.plan,
        options: [
          {
            label: 'Essential',
            value: 'essential',
            helper: 'Travel medical insurance',
            action: stateAction(state, planPatch('essential'))
          },
          {
            label: 'Complete',
            value: 'complete',
            helper: 'Full health cover with travel protections',
            action: stateAction(state, planPatch('complete'))
          }
        ]
      },
      {
        type: 'select',
        label: 'Select age',
        value: state.age,
        options: AGE_BANDS.map((age) => ({
          label: age.label,
          value: age.id,
          helper: state.plan === 'essential' ? `${formatMoney(age.essential4w)} / 4 weeks` : `${formatMoney(age.completeMonth)} / month`,
          action: stateAction(state, { age: age.id })
        }))
      },
      {
        type: 'select',
        label: 'Billing',
        value: state.term,
        options: availableTerms(state).map((term) => ({
          label: term.label,
          value: term.id,
          helper: term.helper || (state.plan === 'complete' ? '12 month commitment' : 'Flexible coverage'),
          action: stateAction(state, { term: term.id })
        }))
      },
      {
        type: 'select',
        label: 'Region and add-ons',
        value: state.region,
        options: regionOptions(state).map((region) => ({
          label: region.label,
          value: region.id,
          helper: region.helper,
          action: stateAction(state, { region: region.id })
        }))
      },
      {
        type: 'list',
        items: [
          { label: '🌍 Geographic coverage', value: plan.countries },
          { label: '🏠 Coverage at home', value: plan.homeCoverage },
          { label: '📌 Selected age', value: ageConfig(state).label },
          { label: '🔁 Selected billing', value: currentTerm.helper ? `${currentTerm.label} (${currentTerm.helper})` : currentTerm.label },
          { label: '➕ Extra cover', value: currentRegion.helper }
        ]
      },
      {
        type: 'buttonRow',
        buttons: [
          { label: `What ${plan.shortName} covers`, variant: 'secondary', action: { type: 'navigate', href: plan.officialUrl } },
          ...navigationButtons(state, { nextLabel: 'Continue to countries →' }).buttons
        ]
      }
    ]
  };
}

function renderCountries(state) {
  const plan = PLANS[state.plan];
  const stayLimit = state.plan === 'essential'
    ? 'Essential: worldwide travel cover, with US only when selected as extra coverage. Home-country stays are limited to 30 days per 90 days of cover, or 15 days for the US.'
    : 'Complete: broader health cover. Hong Kong, Singapore, and United States require the HK/SG/US add-on; otherwise they are not part of standard cover.';
  return {
    type: 'section',
    title: '🌍 Step 2: Check a country',
    description: `${plan.shortName} availability updates from your selected plan and add-on dropdowns. Search one country at a time instead of scanning a long list.`,
    children: [
      summaryList(state),
      { type: 'text', text: stayLimit, tone: 'success' },
      {
        type: 'search',
        label: 'Country',
        value: state.countryQuery,
        placeholder: 'Try United States, Hong Kong, Singapore, Portugal…',
        buttonLabel: 'Check country',
        field: 'countryQuery',
        action: stateAction(state, {})
      },
      countryResultNode(state),
      {
        type: 'buttonRow',
        buttons: [
          { label: 'Open country map', variant: 'secondary', action: { type: 'navigate', href: COUNTRY_MAP_URL } },
          ...navigationButtons(state, { nextLabel: 'Continue to account details →' }).buttons
        ]
      }
    ]
  };
}

function renderAccountDetails(state) {
  return {
    type: 'section',
    title: '👤 Step 3: Account details',
    description: 'Enter the member details that will be sent to the SafetyWing order API when the integration is connected.',
    children: [
      summaryList(state),
      {
        type: 'form',
        fields: [
          { name: 'member.name', label: 'Full name', placeholder: 'Alex Morgan', value: state.member.name },
          { name: 'member.email', label: 'Email', type: 'email', placeholder: 'alex@example.com', value: state.member.email },
          { name: 'member.residence', label: 'Residence country', placeholder: 'Portugal', value: state.member.residence }
        ],
        submitLabel: 'Save details',
        action: stateAction(state, { step: 4 }, 'Details saved')
      },
      navigationButtons(state, { nextLabel: 'Continue to transfer →' })
    ]
  };
}

function renderPayment(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  const region = regionOptions(state).find((item) => item.id === state.region) || regionOptions(state)[0];
  const paymentReference = `${plan.reference}-${state.term}-${state.region}`;
  if (state.status === 'active') {
    return {
      type: 'section',
      title: '🎉 Step 4: Congratulations',
      description: `Your ${plan.shortName} payment was recorded by Wall Money. The dashboard info panel now shows the active plan and coverage date.`,
      children: [
        {
          type: 'stat',
          label: 'Active until',
          value: state.activeUntil || 'Recorded',
          helper: `${plan.name} • ${activePeriodLabel(state)}`
        },
        {
          type: 'list',
          items: [
            { label: '🛡️ Plan', value: plan.name },
            { label: '💵 Cost', value: `${formatMoney(price)} / ${periodFor(state)}` },
            { label: '🧾 Reference', value: paymentReference },
            { label: '👤 Member', value: state.member.name || 'Not entered' },
            { label: '📧 Email', value: state.member.email || 'Not entered' },
            { label: '🕒 Paid', value: formatDate(state.updatedAt) || 'Just now' }
          ]
        },
        {
          type: 'text',
          text: 'Keep your SafetyWing confirmation email and review the official policy terms for exclusions, claims, and renewals.',
          tone: 'success'
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

  return {
    type: 'section',
    title: '💳 Step 4: Pay in Wall Money',
    description: 'This is the final step. Prefill the transfer, finish payment in Wall Money, and the payment result will return you to the congratulations screen.',
    children: [
      summaryList(state),
      {
        type: 'list',
        items: [
          { label: '🧾 Reference', value: paymentReference },
          { label: '🌍 Region', value: region.label },
          { label: '➕ Extra premium', value: region.id === 'standard' ? 'None selected' : 'Quoted by SafetyWing before checkout' },
          { label: '👤 Member', value: state.member.name || 'Not entered yet' },
          { label: '📧 Email', value: state.member.email || 'Not entered yet' }
        ]
      },
      {
        type: 'buttonRow',
        buttons: [
          {
            label: 'Prefill transfer',
            action: {
              type: 'payment',
              request: {
                label: `${plan.name} ${periodFor(state)}`,
                amount: price.toFixed(2),
                reference: paymentReference,
                portalTransfer: {
                  account: 'safetywing',
                  currency: 'USD',
                  amount: price.toFixed(2),
                  platform: 'platform',
                  recurring: state.plan === 'complete' || state.term === '4w' ? 'monthly' : undefined
                }
              }
            }
          },
          ...navigationButtons(state).buttons
        ]
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
        description: 'Choose SafetyWing coverage, review countries, prepare account details, and prefill the Wall Money transfer.',
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
      if (typeof this.unsubscribe === 'function') {
        this.unsubscribe();
      }
    }
  }
};

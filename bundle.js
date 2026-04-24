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
  { country: 'Portugal', essential: '30 days home-country stay', complete: 'covered' },
  { country: 'Thailand', essential: 'available for trip stays', complete: 'available' },
  { country: 'Mexico', essential: 'available for trip stays', complete: 'available' },
  { country: 'Japan', essential: 'available for trip stays', complete: 'available' },
  { country: 'Spain', essential: 'available for trip stays', complete: 'available' },
  { country: 'Indonesia', essential: 'available for trip stays', complete: 'available' }
];

function defaultState() {
  return {
    step: 1,
    plan: 'essential',
    term: '4w',
    age: '10-39',
    member: {
      name: '',
      email: '',
      residence: ''
    },
    status: 'draft',
    updatedAt: null
  };
}

function clampStep(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(5, Math.round(n)));
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

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
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

function navigationButtons(state, options) {
  const current = clampStep(state.step);
  const nextLabel = options && options.nextLabel ? options.nextLabel : 'Next';
  const previous = current > 1
    ? [stateButton(state, 'Previous', { step: current - 1 }, 'secondary')]
    : [];
  const next = current < 5
    ? [stateButton(state, nextLabel, { step: current + 1 }, 'primary')]
    : [];
  return previous.concat(next);
}

function renderStepPicker(state) {
  return {
    type: 'section',
    title: 'Insurance order',
    description: 'Follow the steps to prepare SafetyWing coverage, then prefill the Wall Money transfer.',
    children: [
      {
        type: 'list',
        items: [
          { label: '1. Select plan', value: state.step === 1 ? 'current' : 'ready' },
          { label: '2. Countries', value: state.step === 2 ? 'current' : state.step > 2 ? 'ready' : 'next' },
          { label: '3. Account details', value: state.step === 3 ? 'current' : state.step > 3 ? 'ready' : 'next' },
          { label: '4. Payment transfer', value: state.step === 4 ? 'current' : state.step > 4 ? 'ready' : 'next' },
          { label: '5. Active info panel', value: state.status === 'active' ? 'active' : 'pending' }
        ]
      }
    ]
  };
}

function renderCurrentSummary(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  return {
    type: 'section',
    title: 'Current selection',
    description: 'Your order draft updates as you move through the flow.',
    children: [
      {
        type: 'list',
        items: [
          { label: 'Plan', value: plan.name },
          { label: 'Age', value: ageConfig(state).label },
          { label: 'Billing', value: periodFor(state) },
          { label: 'Cost', value: `${formatMoney(price)} / ${periodFor(state)}` },
          { label: 'Status', value: state.status.replace(/_/g, ' ') }
        ]
      }
    ]
  };
}

function renderPlanSelection(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  return {
    type: 'section',
    title: 'Step 1: Select plan and age',
    description: 'Choose a plan, age band, and billing period. The Complete plan is monthly or yearly with a 12 month commitment.',
    children: [
      {
        type: 'stack',
        gap: 'md',
        children: [
          {
            type: 'list',
            items: [
              { label: 'Selected plan', value: plan.name },
              { label: 'Coverage limit', value: plan.coverageLimit },
              { label: 'Geographic coverage', value: plan.countries },
              { label: 'Coverage at home', value: plan.homeCoverage },
              { label: 'Selected age', value: ageConfig(state).label },
              { label: 'Total cost in USD', value: `${formatMoney(price)} / ${periodFor(state)}` }
            ]
          },
          stateButton(state, 'Use Essential', { plan: 'essential', term: '4w' }, state.plan === 'essential' ? 'primary' : 'secondary'),
          stateButton(state, 'Use Complete', { plan: 'complete', term: 'monthly' }, state.plan === 'complete' ? 'primary' : 'secondary'),
          ...AGE_BANDS.map((age) => ({
            type: 'button',
            label: `Age ${age.label}`,
            variant: state.age === age.id ? 'primary' : 'ghost',
            action: stateAction(state, { age: age.id })
          })),
          ...availableTerms(state).map((term) => ({
            type: 'button',
            label: term.helper ? `${term.label} (${term.helper})` : term.label,
            variant: state.term === term.id ? 'primary' : 'secondary',
            action: stateAction(state, { term: term.id })
          })),
          { type: 'button', label: `What ${plan.shortName} covers`, variant: 'ghost', action: { type: 'navigate', href: plan.officialUrl } },
          ...navigationButtons(state, { nextLabel: 'Continue to countries' })
        ]
      }
    ]
  };
}

function renderCountries(state) {
  return {
    type: 'section',
    title: 'Step 2: Countries and stay limits',
    description: 'Review sample availability here and open the SafetyWing map for the full country list.',
    children: [
      {
        type: 'list',
        items: COUNTRIES.map((entry) => ({
          label: entry.country,
          value: state.plan === 'essential' ? entry.essential : entry.complete
        }))
      },
      { type: 'button', label: 'Open country map', variant: 'secondary', action: { type: 'navigate', href: COUNTRY_MAP_URL } },
      ...navigationButtons(state, { nextLabel: 'Continue to account details' })
    ]
  };
}

function renderAccountDetails(state) {
  return {
    type: 'section',
    title: 'Step 3: Account details',
    description: 'Enter the member details that will be sent to the SafetyWing order API when the integration is connected.',
    children: [
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
      ...navigationButtons(state, { nextLabel: 'Continue to transfer' })
    ]
  };
}

function renderPayment(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  return {
    type: 'section',
    title: 'Step 4: Prefill payment in Wall Money',
    description: 'The transfer is prepared in Wall Money so the portal can record the payment result and return you to this plugin.',
    children: [
      {
        type: 'list',
        items: [
          { label: 'Plan', value: plan.name },
          { label: 'Billing', value: periodFor(state) },
          { label: 'Amount', value: formatMoney(price) },
          { label: 'Reference', value: `${plan.reference}-${state.term}` }
        ]
      },
      {
        type: 'button',
        label: 'Prefill transfer',
        action: {
          type: 'payment',
          request: {
            label: `${plan.name} ${periodFor(state)}`,
            amount: price.toFixed(2),
            reference: `${plan.reference}-${state.term}`,
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
      ...navigationButtons(state, { nextLabel: 'Review status' })
    ]
  };
}

function renderActivity(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  return {
    type: 'section',
    title: state.status === 'active' ? 'Step 5: Active insurance' : 'Latest insurance activity',
    description: 'This is the local status shown in the portal info panel after a plan is prepared or paid.',
    children: [
      {
        type: 'list',
        items: [
          { label: 'Status', value: state.status.replace(/_/g, ' ') },
          { label: 'Plan', value: plan.name },
          { label: 'Age', value: ageConfig(state).label },
          { label: 'Cost', value: `${formatMoney(price)} / ${periodFor(state)}` },
          { label: 'Updated', value: state.updatedAt || 'Not started yet' }
        ]
      },
      ...navigationButtons(state)
    ]
  };
}

function renderCurrentStep(state) {
  if (state.step === 1) return renderPlanSelection(state);
  if (state.step === 2) return renderCountries(state);
  if (state.step === 3) return renderAccountDetails(state);
  if (state.step === 4) return renderPayment(state);
  return renderActivity(state);
}

module.exports = {
  default: {
    setup(hostApi) {
      this.hostApi = hostApi;
      this.unsubscribe = hostApi.events.onPaymentExecuted((result) => {
        if (result.status === 'executed') {
          updateState(hostApi, { status: 'active', step: 5, updatedAt: result.executedAt });
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
              renderStepPicker(state),
              renderCurrentSummary(state),
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

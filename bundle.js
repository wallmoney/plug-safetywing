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
    ? [stateButton(state, '← Previous', { step: current - 1 }, 'secondary')]
    : [];
  const next = current < 5
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
  return {
    type: 'list',
    items: [
      { label: '🛡️ Plan', value: plan.name },
      { label: '🎂 Age', value: ageConfig(state).label },
      { label: '🔁 Billing', value: periodFor(state) },
      { label: '💵 Cost', value: `${formatMoney(price)} / ${periodFor(state)}` }
    ]
  };
}

function renderPlanSelection(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  return {
    type: 'section',
    title: '🧭 Step 1: Choose your cover',
    description: 'Pick the plan, age band, and billing period. Complete can bill monthly or yearly, with a 12 month commitment.',
    children: [
      {
        type: 'stat',
        label: 'Total cost in USD',
        value: `${formatMoney(price)} / ${periodFor(state)}`,
        helper: `${plan.coverageLimit} coverage limit • ${plan.countries}`
      },
      {
        type: 'choiceGroup',
        columns: 'two',
        options: [
          {
            icon: '🩹',
            label: 'Essential',
            value: '$62.72 / 4 weeks from age 10-39',
            helper: 'Travel medical insurance for new and unexpected issues abroad.',
            selected: state.plan === 'essential',
            action: stateAction(state, { plan: 'essential', term: '4w' })
          },
          {
            icon: '🛡️',
            label: 'Complete',
            value: '$177.50 / month from age 10-39',
            helper: 'Full health cover with routine care, wellness support, and travel protections.',
            selected: state.plan === 'complete',
            action: stateAction(state, { plan: 'complete', term: 'monthly' })
          }
        ]
      },
      {
        type: 'choiceGroup',
        columns: 'five',
        options: AGE_BANDS.map((age) => ({
          icon: '🎂',
          label: age.label,
          value: state.plan === 'essential' ? `${formatMoney(age.essential4w)} / 4 weeks` : `${formatMoney(age.completeMonth)} / month`,
          selected: state.age === age.id,
          action: stateAction(state, { age: age.id })
        }))
      },
      {
        type: 'choiceGroup',
        columns: state.plan === 'essential' ? 'two' : 'two',
        options: availableTerms(state).map((term) => ({
          icon: term.id === '364d' || term.id === 'yearly' ? '📅' : '🔁',
          label: term.label,
          badge: term.helper,
          value: term.helper || (state.plan === 'complete' ? '12 month commitment' : 'Flexible coverage'),
          selected: state.term === term.id,
          action: stateAction(state, { term: term.id })
        }))
      },
      {
        type: 'list',
        items: [
          { label: '🌍 Geographic coverage', value: plan.countries },
          { label: '🏠 Coverage at home', value: plan.homeCoverage },
          { label: '📌 Selected age', value: ageConfig(state).label }
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
    ? 'Essential: up to 30 days home-country stay per 90 days of cover (15 days for US).'
    : 'Complete: country of residence is fully covered, subject to plan terms.';
  return {
    type: 'section',
    title: '🌍 Step 2: Countries and stay limits',
    description: `${plan.shortName} is shown with the country availability list and stay rule. Open the map for the official live SafetyWing view.`,
    children: [
      summaryList(state),
      { type: 'text', text: stayLimit, tone: 'success' },
      {
        type: 'list',
        items: COUNTRIES.map(([flag, country]) => ({
          label: `${flag} ${country}`,
          value: state.plan === 'essential' ? 'available' : 'covered'
        }))
      },
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
  return {
    type: 'section',
    title: '💳 Step 4: Prefill payment in Wall Money',
    description: 'The transfer is prepared in Wall Money so the portal can record the payment result and return you to this plugin.',
    children: [
      summaryList(state),
      {
        type: 'list',
        items: [
          { label: '🧾 Reference', value: `${plan.reference}-${state.term}` },
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
          ...navigationButtons(state, { nextLabel: 'Review status →' }).buttons
        ]
      }
    ]
  };
}

function renderActivity(state) {
  const plan = PLANS[state.plan];
  const price = priceFor(state);
  return {
    type: 'section',
    title: state.status === 'active' ? '✅ Step 5: Active insurance' : '📋 Step 5: Insurance status',
    description: 'This is the local status shown in the portal info panel after a plan is prepared or paid.',
    children: [
      summaryList(state),
      {
        type: 'list',
        items: [
          { label: '📌 Status', value: state.status.replace(/_/g, ' ') },
          { label: '🛡️ Plan', value: plan.name },
          { label: '💵 Cost', value: `${formatMoney(price)} / ${periodFor(state)}` },
          { label: '🕒 Updated', value: state.updatedAt || 'Not started yet' }
        ]
      },
      navigationButtons(state)
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

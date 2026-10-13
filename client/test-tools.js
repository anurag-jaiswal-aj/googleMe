import test from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_TOOLS,
  TOOLS,
  VALID_LEVELS,
  isValidHexColor,
  validateToolsConfig,
  getEffectiveTools,
  getToolCards,
} from './src/data/toolsData.js';

test('Toolkit: DEFAULT_TOOLS preserves exactly 8 categories and 38 skills', () => {
  assert.strictEqual(DEFAULT_TOOLS.length, 8);
  const totalSkills = DEFAULT_TOOLS.reduce((acc, cat) => acc + (cat.items?.length || 0), 0);
  assert.strictEqual(totalSkills, 38);

  const categoryNames = DEFAULT_TOOLS.map((c) => c.category);
  assert.deepStrictEqual(categoryNames, [
    'Languages',
    'Frontend',
    'Backend',
    'Database',
    'Machine Learning',
    'DSA',
    'UI / UX',
    'Tools & Workflow',
  ]);
});

test('Toolkit: TOOLS is exported as an alias for DEFAULT_TOOLS for backward compatibility', () => {
  assert.strictEqual(TOOLS, DEFAULT_TOOLS);
});

test('Toolkit: isValidHexColor correctly validates 6-digit hex format', () => {
  assert.strictEqual(isValidHexColor('#4285F4'), true);
  assert.strictEqual(isValidHexColor('#34a853'), true);
  assert.strictEqual(isValidHexColor('#000000'), true);
  assert.strictEqual(isValidHexColor('#ffffff'), true);
  assert.strictEqual(isValidHexColor('#fff'), false); // Requires 6 digits for consistency
  assert.strictEqual(isValidHexColor('blue'), false);
  assert.strictEqual(isValidHexColor('#GGGGGG'), false);
  assert.strictEqual(isValidHexColor(null), false);
  assert.strictEqual(isValidHexColor(undefined), false);
});

test('Toolkit: validateToolsConfig passes for DEFAULT_TOOLS', () => {
  const result = validateToolsConfig(DEFAULT_TOOLS);
  assert.strictEqual(result.valid, true);
});

test('Toolkit: validateToolsConfig rejects non-array or empty configurations', () => {
  assert.strictEqual(validateToolsConfig(null).valid, false);
  assert.strictEqual(validateToolsConfig({}).valid, false);
  assert.strictEqual(validateToolsConfig([]).valid, false);
  assert.match(validateToolsConfig([]).error, /at least one category/i);
});

test('Toolkit: validateToolsConfig catches missing category properties or invalid colors', () => {
  const badCategory = [
    {
      category: '',
      title: 'Title',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'A', level: 'Expert', desc: 'B' }],
    },
  ];
  assert.strictEqual(validateToolsConfig(badCategory).valid, false);

  const badColor = [
    {
      category: 'Languages',
      title: 'Title',
      color: '#zzz',
      snippet: 'Snippet',
      items: [{ name: 'A', level: 'Expert', desc: 'B' }],
    },
  ];
  assert.strictEqual(validateToolsConfig(badColor).valid, false);
});

test('Toolkit: validateToolsConfig catches invalid skill levels or empty items', () => {
  const emptyItems = [
    {
      category: 'Languages',
      title: 'Title',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [],
    },
  ];
  assert.strictEqual(validateToolsConfig(emptyItems).valid, false);

  const badLevel = [
    {
      category: 'Languages',
      title: 'Title',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Legend', desc: 'Desc' }],
    },
  ];
  assert.strictEqual(validateToolsConfig(badLevel).valid, false);
});

test('Toolkit: getEffectiveTools falls back to DEFAULT_TOOLS on missing or malformed data', () => {
  assert.strictEqual(getEffectiveTools(null), DEFAULT_TOOLS);
  assert.strictEqual(getEffectiveTools(undefined), DEFAULT_TOOLS);
  assert.strictEqual(getEffectiveTools([]), DEFAULT_TOOLS);
  assert.strictEqual(getEffectiveTools('string'), DEFAULT_TOOLS);
  assert.strictEqual(getEffectiveTools([{ malformed: true }]), DEFAULT_TOOLS);
});

test('Toolkit: getEffectiveTools normalizes and preserves valid saved tools', () => {
  const custom = [
    {
      category: ' Cloud & DevOps ',
      title: ' Cloud Platforms ',
      color: '#4285F4',
      snippet: ' AWS and GCP workloads. ',
      items: [
        { name: ' AWS ', level: 'Expert', desc: ' EC2 and S3. ' },
      ],
    },
  ];
  const effective = getEffectiveTools(custom);
  assert.strictEqual(effective.length, 1);
  assert.strictEqual(effective[0].category, 'Cloud & DevOps');
  assert.strictEqual(effective[0].title, 'Cloud Platforms');
  assert.strictEqual(effective[0].snippet, 'AWS and GCP workloads.');
  assert.strictEqual(effective[0].items[0].name, 'AWS');
  assert.strictEqual(effective[0].items[0].desc, 'EC2 and S3.');
});

test('Toolkit: getToolCards correctly generates search result card models with slug and letter', () => {
  const cards = getToolCards(DEFAULT_TOOLS);
  assert.strictEqual(cards.length, 8);
  assert.strictEqual(cards[0].url, 'anuragjaiswal.me/toolkit/languages');
  assert.strictEqual(cards[0].title, 'Languages I Code In');
  assert.strictEqual(cards[0].faviconBg, '#4285F4');
  assert.strictEqual(cards[0].faviconLetter, 'L');
  assert.strictEqual(cards[0].items.length, 6);
});

test('Toolkit: /tools and /all consume the same effective data', () => {
  const savedTools = [
    {
      category: 'Custom Category',
      title: 'Custom Title',
      color: '#34A853',
      snippet: 'Custom Snippet',
      items: [
        { name: 'Custom Skill', level: 'Proficient', desc: 'Skill description.' },
      ],
    },
  ];

  const toolsPageData = getEffectiveTools(savedTools);
  const allPageCards = getToolCards(savedTools);

  assert.strictEqual(toolsPageData.length, 1);
  assert.strictEqual(allPageCards.length, 1);
  assert.strictEqual(allPageCards[0].category, toolsPageData[0].category);
  assert.strictEqual(allPageCards[0].title, toolsPageData[0].title);
  assert.strictEqual(allPageCards[0].snippet, toolsPageData[0].snippet);
  assert.strictEqual(allPageCards[0].items.length, toolsPageData[0].items.length);
  assert.strictEqual(allPageCards[0].items[0].name, toolsPageData[0].items[0].name);
});

test('Toolkit: validateToolsConfig rejects exact duplicate category names', () => {
  const duplicateExact = [
    {
      category: 'Languages',
      title: 'Languages 1',
      color: '#4285F4',
      snippet: 'Snippet 1',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
    {
      category: 'Languages',
      title: 'Languages 2',
      color: '#34A853',
      snippet: 'Snippet 2',
      items: [{ name: 'Python', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const result = validateToolsConfig(duplicateExact);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error, 'Duplicate category name "Languages". Category names must be unique.');
});

test('Toolkit: validateToolsConfig rejects duplicate category names with different casing', () => {
  const duplicateCase = [
    {
      category: 'Languages',
      title: 'Languages',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
    {
      category: 'LANGUAGES',
      title: 'Languages Upper',
      color: '#34A853',
      snippet: 'Snippet',
      items: [{ name: 'Python', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const result = validateToolsConfig(duplicateCase);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error, 'Duplicate category name "LANGUAGES". Category names must be unique.');
});

test('Toolkit: validateToolsConfig rejects duplicate category names with leading/trailing whitespace', () => {
  const duplicateWhitespace = [
    {
      category: 'Languages',
      title: 'Languages',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
    {
      category: '   languages   ',
      title: 'Languages Spaced',
      color: '#34A853',
      snippet: 'Snippet',
      items: [{ name: 'Python', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const result = validateToolsConfig(duplicateWhitespace);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error, 'Duplicate category name "languages". Category names must be unique.');
});

test('Toolkit: validateToolsConfig accepts valid distinct category names', () => {
  const distinct = [
    {
      category: 'Frontend',
      title: 'Frontend Web',
      color: '#4285F4',
      snippet: 'Web UI',
      items: [{ name: 'React', level: 'Expert', desc: 'Component architecture' }],
    },
    {
      category: 'Backend',
      title: 'Backend Systems',
      color: '#34A853',
      snippet: 'Servers and APIs',
      items: [{ name: 'Node.js', level: 'Proficient', desc: 'Express and APIs' }],
    },
    {
      category: 'Database',
      title: 'Databases & Storage',
      color: '#FBBC05',
      snippet: 'Data layers',
      items: [{ name: 'MongoDB', level: 'Intermediate', desc: 'Document store' }],
    },
  ];
  const result = validateToolsConfig(distinct);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.error, undefined);
});

test('Toolkit: getEffectiveTools falls back to DEFAULT_TOOLS when saved config has duplicate categories', () => {
  const invalidSaved = [
    {
      category: 'Languages',
      title: 'Title',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
    {
      category: 'languages',
      title: 'Title 2',
      color: '#34A853',
      snippet: 'Snippet 2',
      items: [{ name: 'Python', level: 'Expert', desc: 'Desc' }],
    },
  ];
  assert.strictEqual(getEffectiveTools(invalidSaved), DEFAULT_TOOLS);
});

test('Toolkit: getEffectiveTools preserves original casing of category names when valid', () => {
  const custom = [
    {
      category: '  Cloud & DevOps  ',
      title: 'Cloud Platforms',
      color: '#4285F4',
      snippet: 'AWS infrastructure',
      items: [{ name: 'AWS', level: 'Expert', desc: 'Cloud' }],
    },
    {
      category: 'CI/CD Pipelines',
      title: 'Automation',
      color: '#34A853',
      snippet: 'Workflows',
      items: [{ name: 'GitHub Actions', level: 'Proficient', desc: 'Automation' }],
    },
  ];
  const effective = getEffectiveTools(custom);
  assert.strictEqual(effective.length, 2);
  assert.strictEqual(effective[0].category, 'Cloud & DevOps');
  assert.strictEqual(effective[1].category, 'CI/CD Pipelines');
});

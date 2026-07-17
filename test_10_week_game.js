const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('math-adventure-10-weeks.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
if (scripts.length !== 2) throw new Error(`Expected 2 scripts, found ${scripts.length}`);

let expansion = scripts[1];
expansion = expansion.split("document.querySelector('.typing-intro')")[0];

const context = vm.createContext({
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  JSON,
  setTimeout: () => 0,
  clearTimeout: () => {},
  localStorage: { getItem: () => null, setItem: () => {} },
  randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  DAYS: [],
  progress: {},
  sessionProgress: {},
  svgAnimal: () => '',
  startDay: () => {},
  finishDay: () => {},
  renderGallery: () => {},
  goToLevels: () => {},
  saveProgress: () => {},
  editableBorrowClick: html.includes('borrow-editable') && html.includes('wasFocusedBeforeTap') && !html.includes('borrow-input-dot'),
  blankWordScratch: html.includes('function blankScratchOperands') && html.includes('q.word ? blankScratchOperands(q.s) : q.s'),
});

vm.runInContext(expansion, context, { filename: '10-week-expansion.js' });

const summary = vm.runInContext(`(() => {
  const badAnswers = DAYS.filter(day => day.questions.some(q => !Number.isFinite(q.a))).length;
  const badCounts = DAYS.filter(day => day.questions.length !== 10).length;
  const badFacts = DAYS.filter(day => day.facts.length !== 5).length;
  const weekSizes = Array.from({length:10}, (_, week) => DAYS.filter(day => day.week === week).length);
  const firstRun = JSON.stringify(tenQuestionsFor(9, 7).map(q => [q.t,q.a]));
  const secondRun = JSON.stringify(tenQuestionsFor(9, 7).map(q => [q.t,q.a]));
  const unitGateTypes=['time','moneyConvert','lengthConvert','massConvert','capacityConvert'];
  const badUnitGates=unitGateTypes.filter(type=>{
    const question=tenGenerate(type,5,3);
    return !question.unitGate || !Number.isFinite(question.unitGate.answer) || !question.unitGate.question || !question.unitGate.success;
  });
  let stressFailures = 0;
  for(let round=0; round<50; round++){
    for(let week=0; week<10; week++){
      for(let day=1; day<=7; day++){
        const generated=tenQuestionsFor(week,day);
        if(generated.length!==10 || generated.some(q=>!Number.isFinite(q.a) || !q.t || !q.s)) stressFailures++;
      }
    }
  }
  const stockOrders=new Set();
  const stockTexts=new Set();
  for(let index=0; index<250; index++){
    const stock=tenGenerate('stock',5,3);
    stockOrders.add(stock.opSequence.join(''));
    stockTexts.add(stock.t.split('.')[0]);
  }
  const expression=tenGenerate('expr',5,3);
  return {
    totalDays: DAYS.length,
    weekSizes,
    questionsPerDay: [...new Set(DAYS.map(day => day.questions.length))],
    factsPerDay: [...new Set(DAYS.map(day => day.facts.length))],
    badAnswers,
    badCounts,
    badFacts,
    regeneratedDifferently: firstRun !== secondRun,
    unitGatesChecked: unitGateTypes.length,
    badUnitGates,
    editableBorrowClick,
    blankWordScratch,
    stockOrders:[...stockOrders].sort(),
    stockVariantCount:stockTexts.size,
    expressionFirstOperationGate:expression.firstOperationOnly===true && expression.revealScratchAfterOperation===true,
    stressFailures,
    sampleWeek1: DAYS[0].questions.map(q => q.t),
    sampleWeek10: DAYS[69].questions.map(q => q.t)
  };
})()`, context);

console.log(JSON.stringify(summary, null, 2));
if (summary.totalDays !== 70) process.exitCode = 1;
if (summary.weekSizes.some(size => size !== 7)) process.exitCode = 1;
if (summary.badAnswers || summary.badCounts || summary.badFacts) process.exitCode = 1;
if (summary.stressFailures) process.exitCode = 1;
if (summary.badUnitGates.length) process.exitCode = 1;
if (!summary.editableBorrowClick || !summary.blankWordScratch) process.exitCode = 1;
if (!summary.stockOrders.includes('+-') || !summary.stockOrders.includes('-+') || summary.stockVariantCount < 4) process.exitCode = 1;
if (!summary.expressionFirstOperationGate) process.exitCode = 1;
if (!summary.regeneratedDifferently) process.exitCode = 1;

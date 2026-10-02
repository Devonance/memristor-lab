// Memristor Lab — reference content: parts guide, circuit symbols, deep-dive articles.

/* ── circuit symbols (stroke = currentColor) ───────────── */
const S = (body, vb = '0 0 120 60') => `<svg viewBox="${vb}" class="sym" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const SYM = {
  battery: S('<path d="M4 30h34M82 30h34"/><path d="M38 14v32M60 14v32" /><path d="M48 22v16M70 22v16" stroke-width="6"/><path d="M74 30h8" /><text x="30" y="12" font-size="12" fill="currentColor" stroke="none">+</text><text x="76" y="12" font-size="12" fill="currentColor" stroke="none">−</text>'),
  button: S('<path d="M4 44h32M84 44h32"/><circle cx="38" cy="44" r="3" fill="currentColor"/><circle cx="82" cy="44" r="3" fill="currentColor"/><path d="M34 30h52M60 30V10M50 10h20"/>'),
  switch: S('<path d="M4 20h30M4 44h30"/><circle cx="36" cy="20" r="3" fill="currentColor"/><circle cx="36" cy="44" r="3" fill="currentColor"/><path d="M36 20l40-10M36 44l40-10" /><circle cx="80" cy="8" r="3"/><circle cx="80" cy="30" r="3"/><circle cx="80" cy="34" r="3"/><circle cx="80" cy="54" r="3"/><path d="M56 15v24" stroke-dasharray="3 4"/><path d="M84 8h32M84 54h32M84 30h32M84 34h32" opacity=".55"/>'),
  memristor: S('<path d="M4 30h22M94 30h22"/><rect x="26" y="16" width="68" height="28" rx="2"/><rect x="80" y="16" width="14" height="28" fill="currentColor"/><path d="M32 30h8v-7h10v14h10v-14h10v7h6" stroke-width="2.4"/>'),
  resistor: S('<path d="M4 30h22l5-12 10 24 10-24 10 24 10-24 10 24 5-12h30"/>'),
  resistorIEC: S('<path d="M4 30h26M90 30h26"/><rect x="30" y="18" width="60" height="24" rx="2"/>'),
  led: S('<path d="M4 30h38M78 30h38"/><path d="M42 14v32l32-16z"/><path d="M74 14v32"/><path d="M60 10l10-10M66 14l10-10" stroke-width="2.4"/><path d="M70 0h6v6M76 4h6v6" stroke-width="2.4"/>'),
  capacitor: S('<path d="M4 30h48M68 30h48M52 12v36M68 12v36"/>'),
  inductor: S('<path d="M4 30h18c0-14 16-14 16 0c0-14 16-14 16 0c0-14 16-14 16 0c0-14 16-14 16 0h18"/>'),
  wire: S('<path d="M4 20h112M60 4v52"/><circle cx="60" cy="20" r="5" fill="currentColor"/><path d="M4 46h50M66 46h50"/><path d="M54 46c0-8 12-8 12 0"/>'),
  ground: S('<path d="M60 4v24M36 28h48M44 38h32M52 48h16"/>'),
  breadboard: S('<rect x="6" y="6" width="108" height="48" rx="4"/><path d="M14 14h92" stroke="#ff5a5a"/><path d="M14 46h92" stroke="#5ad8ff"/><path d="M14 30h92" stroke-dasharray="2 6" stroke-width="5"/>'),
};

/* ── parts guide ───────────────────────────────────────── */
export const PARTS = [
  {
    key: 'battery', name: 'Battery (2 × AA)', anchor: 'bat', sym: 'battery',
    what: 'A store of chemical energy. It pushes electricity out of its <b>+</b> end, around the circuit, and back into its <b>−</b> end, like a pump pushing water round a loop of pipe.',
    here: 'Two AA cells end-to-end (in “series”) add their pushes: 1.5 V + 1.5 V = 3 V. The red lead goes to the + power rail and the black lead to the − rail.',
    read: ['On the cell itself, <b>+</b> is the end with the little bump.', 'In a circuit diagram a cell is a <b>long thin line (+)</b> next to a <b>short thick line (−)</b>. Two cells are drawn as two pairs.', 'Red wire = +, black wire = −. That colour habit is almost universal.'],
    where: 'In the black holder to the left of the board; its leads plug into the top + and − rails at column 2.',
    tech: 'Alkaline LR6, ~1.5 V open-circuit each, internal resistance ~0.1–0.3 Ω.',
  },
  {
    key: 'button', name: 'Push button', anchor: 'btn', sym: 'button',
    what: 'A switch that only connects while you hold it down. Let go and a spring pops it back up, breaking the circuit.',
    here: 'It is the “on” button for the whole circuit. Nothing flows unless you hold it. Tap it in 3D, hold the big HOLD button, or press the space bar.',
    read: ['In a diagram: two dots with a little bridge on a stalk above them. Pressing pushes the bridge down onto the dots.', 'Real ones have <b>4 legs</b>. The legs are joined inside in pairs, so the button connects one pair to the other.'],
    where: 'The blue cap straddling the centre trench at columns 4–6.',
    tech: '12 mm tactile switch, normally open (SPST-NO).',
  },
  {
    key: 'switch', name: 'Direction switch', anchor: 'sw', sym: 'switch',
    what: 'A slide switch with two sets of contacts that move together. Sliding it picks which of two paths the electricity takes.',
    here: 'Wired with the two <b>crossed wires</b> (green and blue), it swaps which end of the black box gets + and which gets −. That reverses the current, which makes the box “forget”.',
    read: ['In a diagram: two switch arms joined by a dashed line, which means they move together.', 'It has <b>six legs</b> in two rows of three. The middle leg of each row is the common one; the slider connects it to the left or right leg.'],
    where: 'Silver box at columns 9–11, straddling the trench.',
    tech: 'DPDT slide switch wired as a polarity reverser (H-bridge without transistors).',
  },
  {
    key: 'blackbox', name: 'Black box “M?”', anchor: 'box', sym: 'memristor',
    what: 'A stand-in for a part that doesn’t exist yet: the <b>perfect memristor</b>. We programmed it to obey Chua’s 1971 equation exactly.',
    here: 'Its resistance falls as charge flows forward and rises as charge flows back. When nothing flows it keeps its value. That is the memory you see in the LED.',
    read: ['The memristor symbol is a box with a <b>thick band at one end</b>. The band marks the direction that lowers its resistance.', 'Its glowing mark on top brightens as its resistance drops, so you can see its memory even with the power off.'],
    where: 'The glossy black block with pins in c14 and c18.',
    tech: 'Ideal charge-controlled memristor: v = M(q)·i, logistic M(q), R_on = 100 Ω, R_off = 10 kΩ.',
  },
  {
    key: 'resistor', name: 'Resistor (220 Ω)', anchor: 'res', sym: 'resistor',
    what: 'A part that makes it harder for electricity to flow, like a narrow bit of pipe. Its job here is protection.',
    here: 'It limits the current so the LEDs don’t burn out. Without it, an LED connected straight to a battery can be destroyed in a flash.',
    read: ['Read the <b>colour bands</b> from the end with the bands bunched together: <b>1st digit, 2nd digit, multiplier, tolerance</b>.', 'Here: <span class="band" style="--c:#c3241e">red 2</span> <span class="band" style="--c:#c3241e">red 2</span> <span class="band" style="--c:#6b3a17">brown ×10</span> <span class="band" style="--c:#c9a13c">gold ±5%</span> → 22 × 10 = <b>220 Ω</b>.', 'Symbol: a zig-zag line (America) or a plain rectangle (Europe).'],
    where: 'Beige part from b18 to b22.',
    tech: '¼ W carbon film, E12 series. Colour code: black 0, brown 1, red 2, orange 3, yellow 4, green 5, blue 6, violet 7, grey 8, white 9.',
  },
  {
    key: 'led', name: 'LEDs (green and red)', anchor: 'ledg', sym: 'led',
    what: 'A light-emitting diode is a tiny lamp that only lets electricity through <b>one way</b>. It needs about 2 V before it lights, then glows brighter with more current.',
    here: 'They are wired back-to-back: green lights when current flows forward through the box, red when it flows backward. Brightness shows how easily current is getting through the box.',
    read: ['The <b>longer leg is +</b> (the anode). The leg next to the <b>flat edge</b> on the rim is − (the cathode).', 'Symbol: a triangle pointing along a bar, with two little arrows for light. Current flows the way the triangle points; the bar is the − side.'],
    where: 'Green at d22–d23, red at a22–a23 (turned the other way round).',
    tech: 'Forward voltage ≈ 2.0 V; anti-parallel pair acts as a bipolar indicator.',
  },
  {
    key: 'jumper', name: 'Jumper wires', anchor: 'jumper', sym: 'wire',
    what: 'Short insulated wires with bare metal tips that plug into breadboard holes to connect things.',
    here: 'Seven jumpers join the parts. <b>Red</b> goes to +, <b>black</b> to −, the long <b>white</b> one brings current back from the LEDs, and the <b>green and blue</b> ones cross over to reverse the direction.',
    read: ['In a diagram a line is a wire. A <b>dot</b> where lines cross means they are joined. <b>No dot</b> (or a little hop) means they just pass over each other.', 'Wire colour does nothing electrically. It is a habit that helps humans: red +, black −.'],
    where: 'Arching over the board between holes.',
    tech: '22 AWG solid core, tinned ends.',
  },
  {
    key: 'breadboard', name: 'Breadboard', anchor: 'board', sym: 'breadboard', anatomy: true,
    what: 'A white plastic board for building circuits without soldering. Hidden under the holes are <b>metal spring clips</b> that grip a wire and join it to its neighbours.',
    here: 'Everything plugs into it. It decides which legs are connected to which, so understanding it is the key to reading the circuit.',
    read: ['<b>Power rails</b>: the long rows along each edge, marked <span class="c-red">+ red</span> and <span class="c-cyan">− blue</span>. Every hole along a rail is connected.', '<b>Component strips</b>: each numbered column has two short strips of 5 holes (a–e and f–j). The 5 holes in a strip are connected to each other, but not to the next column.', '<b>Centre trench</b>: the groove down the middle separates the two halves, so a chip or button can straddle it without shorting its legs together.', '<b>Hole names</b> are like map coordinates: “c14” means row c, column 14.', '<b>Gotcha:</b> on many boards the top and bottom rails are <em>not</em> connected to each other. That is why a black jumper on the right ties our two − rails together.'],
    where: 'The whole white board. Use <b>See inside</b> to reveal the metal strips.',
    tech: 'Half-size, 400 tie points, 0.1" (2.54 mm) pitch. Contact resistance ~10–50 mΩ per clip.',
  },
];

/* ── a schematic of the breadboard circuit (parts clickable) ── */
export const SCHEMATIC = `<svg viewBox="0 0 560 230" class="schem" role="img" aria-label="Circuit diagram of the breadboard circuit">
  <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M50 40h60M170 40h40v40M50 100v90h160v-60" class="w"/>
    <path d="M290 80V40h40M410 40h40M510 40h20v60M530 140v50H290v-60" class="w"/>
  </g>
  <g class="sp" data-part="battery" transform="translate(20 70) rotate(90 30 0)"><rect class="hit" x="-6" y="-26" width="72" height="52"/>
    <path d="M0 0h18M42 0h18M18 -16v32M30 -9v18M30 0h12" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M30 -9v18" stroke="currentColor" stroke-width="6"/></g>
  <text x="66" y="76" class="lbl">battery 3 V</text>
  <g class="sp" data-part="button" transform="translate(110 40)"><rect class="hit" x="-4" y="-34" width="68" height="44"/>
    <path d="M0 0h12M48 0h12M8 -12h44M30 -12v-14M22 -26h16" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="14" cy="0" r="3" fill="currentColor"/><circle cx="46" cy="0" r="3" fill="currentColor"/></g>
  <text x="112" y="62" class="lbl">button</text>
  <g class="sp" data-part="switch" transform="translate(190 60)"><rect class="hit" x="0" y="0" width="120" height="90" rx="10"/>
    <rect x="20" y="0" width="80" height="90" rx="8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
    <path d="M20 20h20l40 50h20M20 70h20l40-50h20" fill="none" stroke="currentColor" stroke-width="2.5"/></g>
  <text x="250" y="170" class="lbl" text-anchor="middle">direction switch</text>
  <g class="sp" data-part="blackbox" transform="translate(330 40)"><rect class="hit" x="-4" y="-22" width="88" height="44"/>
    <rect x="10" y="-14" width="60" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="58" y="-14" width="12" height="28" fill="currentColor"/>
    <path d="M0 0h10M70 0h10" stroke="currentColor" stroke-width="2.5"/></g>
  <text x="370" y="74" class="lbl" text-anchor="middle">M? black box</text>
  <g class="sp" data-part="resistor" transform="translate(450 40)"><rect class="hit" x="-4" y="-20" width="68" height="40"/>
    <path d="M0 0h10l5-10 8 20 8-20 8 20 8-20 5 10h8" fill="none" stroke="currentColor" stroke-width="2.5"/></g>
  <text x="480" y="74" class="lbl" text-anchor="middle">220 Ω</text>
  <g class="sp" data-part="led" transform="translate(530 100)"><rect class="hit" x="-34" y="-4" width="68" height="48"/>
    <path d="M-14 0v40M14 0v40M-14 0h28M-14 40h28" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <path d="M-24 12h20l-10 16z" fill="#5ef0a8" stroke="#5ef0a8"/><path d="M-24 28h20" stroke="#5ef0a8" stroke-width="2.5"/>
    <path d="M4 28h20l-10 -16z" fill="#ff5a5a" stroke="#ff5a5a"/><path d="M4 12h20" stroke="#ff5a5a" stroke-width="2.5"/></g>
  <text x="530" y="160" class="lbl" text-anchor="middle">LEDs</text>
  <text x="60" y="214" class="lbl dim">tap a part to find it on the board</text>
</svg>`;

/* ── deep dives ───────────────────────────────────────── */
export const ARTICLES = [
  {
    id: 'electricity', title: 'Electricity in five minutes', blurb: 'Voltage, current and resistance with a water pipe you can play with.',
    html: `<p>Almost all of electronics rests on three ideas. A water pipe is the classic way to picture them.</p>
<div class="wpipe" id="wpipe">
  <svg viewBox="0 0 420 140" aria-hidden="true"><defs><linearGradient id="wg" x1="0" x2="1"><stop offset="0" stop-color="#1b6fd8"/><stop offset="1" stop-color="#5ad8ff"/></linearGradient></defs>
    <rect x="10" y="40" width="70" height="60" rx="8" fill="#1a2433" stroke="#3b4a60"/><text x="45" y="76" text-anchor="middle" fill="#9aa6b8" font-size="12">pump</text>
    <path id="wpBody" d="" fill="url(#wg)" opacity=".85"/><g id="wpDrops"></g>
    <circle id="wpLamp" cx="380" cy="70" r="22" fill="#5ef0a8" opacity=".2"/><text x="380" y="112" text-anchor="middle" fill="#9aa6b8" font-size="11">LED</text></svg>
  <label class="sl"><span>Voltage: the pump's push <output id="wpVo">3.0 V</output></span><input id="wpV" type="range" min="0" max="9" step="0.1" value="3"></label>
  <label class="sl"><span>Resistance: how narrow the pipe is <output id="wpRo">220 Ω</output></span><input id="wpR" type="range" min="47" max="1000" step="1" value="220"></label>
  <p class="wpout">Current = voltage ÷ resistance = <b id="wpI">13.6 mA</b></p>
</div>
<ul><li><b>Voltage</b> (volts, V) is the push, like water pressure.</li><li><b>Current</b> (amps, A) is the flow: how much passes each second.</li><li><b>Resistance</b> (ohms, Ω) is how hard the pipe makes it to flow.</li></ul>
<p>They are tied together by <b>Ohm's law</b>: current = voltage ÷ resistance. Double the push and you double the flow. Double the narrowness and you halve it. A memristor is a pipe whose width changes depending on how much water has already flowed through it.</p>
<p class="pro">I = V/R; power P = V·I. A memristor replaces the constant R with M(q), where q = ∫I dt.</p>
<h4 class="ah4">Myth or fact? Tap a card</h4>
<div class="myths">
  <button class="myth"><b>“A bulb uses up the current.”</b><span><b class="c-red">Myth.</b> The same current flows in and out. What gets used is <em>energy</em>, which turns into light and heat.</span></button>
  <button class="myth"><b>“A battery is full of electricity.”</b><span><b class="c-red">Myth.</b> It stores <em>chemical</em> energy. The chemistry pushes charges that are already in the wires around the loop.</span></button>
  <button class="myth"><b>“A battery always gives the same current.”</b><span><b class="c-red">Myth.</b> It gives (roughly) the same <em>push</em>. The resistance in the circuit decides how much current flows.</span></button>
  <button class="myth"><b>“Nothing happens unless the loop is closed.”</b><span><b class="c-green">Fact.</b> Electricity needs a complete path from + back to −. A single gap stops everything. That's what a switch is.</span></button>
</div>
<h4 class="ah4">Fast signal, slow electrons</h4>
<p>Flip a switch and the light comes on almost instantly, because the <em>push</em> travels down the wire at roughly two-thirds the speed of light. The electrons themselves barely move. In a household-size copper wire carrying 20 A they drift at about <b>0.45 mm per second</b>, so one electron would need over half an hour to travel a metre. Think of a pipe already full of water: push at one end and water comes out of the other end straight away.</p>
<p class="note">Sources: OpenStax <i>College Physics 2e</i>, Example 20.3; typical cable velocity factor ≈ 0.66.</p>
<h4 class="ah4">Safe tinkering</h4>
<ul><li>AA batteries and a breadboard, like this lab, are a safe way to start.</li><li>Never short a battery's + and − together, and keep loose cells away from keys and coins. Lithium cells can overheat or catch fire when shorted.</li><li>Never experiment with wall (mains) electricity. It can kill.</li></ul>`,
  },
  {
    id: 'symbols', title: 'How to read a circuit diagram', blurb: 'The symbols engineers use, and what each one means.',
    html: `<p>A circuit diagram (schematic) is a map of connections, not a picture. Parts become symbols and wires become straight lines. Where the parts sit on the real board doesn't matter, only what is connected to what.</p>
<div class="symgrid">${['battery|Battery|Long line +, short line −.', 'resistor|Resistor|Zig-zag (US) or box (Europe).', 'led|LED|Triangle points the way current flows. Arrows = light.', 'button|Push button|Connects only while pressed.', 'switch|Two-way switch|Dashed line: both arms move together.', 'capacitor|Capacitor|Two plates with a gap.', 'inductor|Inductor|A coil of wire.', 'memristor|Memristor|Box with a thick band marking “forward”.', 'wire|Wires|Dot = joined. Hop = not joined.', 'ground|Ground|The shared 0 V reference.'].map((r) => { const [k, t, d] = r.split('|'); return `<div class="symcard"><div class="symbox" data-sym="${k}"></div><b>${t}</b><span>${d}</span></div>`; }).join('')}</div>
<p>Try it: open the <b>Parts guide</b> on the breadboard station and tap a symbol in the circuit diagram. The camera flies to that part on the board.</p>`,
  },
  {
    id: 'compute', title: 'Computing inside memory', blurb: 'Why memristors excite AI-chip designers. Try a 3 × 3 crossbar.',
    html: `<p>AI models spend most of their time doing one thing: multiplying lists of numbers and adding up the results. Normal chips move every number from memory to a processor and back, and that shuttling burns most of the energy.</p>
<p>A grid of memristors, called a <b>crossbar</b>, can do the multiply-and-add <em>where the numbers are stored</em>. Each memristor's conductance is a stored number. Apply voltages to the rows (the inputs) and, by Ohm's law, each memristor passes current = conductance × voltage. The currents from a whole column simply add up in the wire (Kirchhoff's law). The answer is read off the bottom in one step.</p>
<div class="xbar" id="xbar"></div>
<p class="note">Tap a cell to change its stored value. Drag the input sliders. The output bars are the column currents: the result of the multiplication.</p>
<p>The catch is everything you've seen in this lab. Real devices are noisy, drift over time, switch unevenly, and differ from one another. A lot of current research models exactly those imperfections to predict how accurate an AI chip will be.</p>
<p class="pro">Analog in-memory MVM: I_j = Σ_i G_ij V_i. Key non-idealities: conductance-update nonlinearity and asymmetry, cycle-to-cycle noise, retention and drift, read disturb, endurance. Tools such as IBM's AIHWKit and NeuroSim fold these into network-level accuracy estimates.</p>`,
  },
  {
    id: 'ledcalc', title: 'Pick the right resistor for an LED', blurb: 'A calculator that shows why the 220 Ω resistor is there.',
    html: `<p>An LED needs about 2 V before it lights, but above that its current shoots up. Too much current and it burns out in a flash. A resistor in series takes up the extra voltage and sets the current.</p>
<div class="ledcalc" id="ledcalc">
  <div class="lcrow"><label class="sl"><span>Battery voltage <output id="lcVo">5.0 V</output></span><input id="lcV" type="range" min="3" max="12" step="0.5" value="5"></label></div>
  <div class="lcrow"><span class="lclab">LED colour</span><div class="seg small" id="lcCol"><button data-vf="1.8" data-c="#ff3b30">Red</button><button data-vf="2.1" data-c="#ffd60a">Yellow</button><button data-vf="2.2" data-c="#30d158" class="on">Green</button><button data-vf="3.1" data-c="#64d2ff">Blue</button><button data-vf="3.1" data-c="#ffffff">White</button></div></div>
  <div class="lcrow"><label class="sl"><span>Brightness (current) <output id="lcIo">15 mA</output></span><input id="lcI" type="range" min="2" max="30" step="1" value="15"></label></div>
  <div class="lcout"><div class="lcled" id="lcLed"></div><div><p>Resistor needed: <b id="lcR">—</b></p><p>Nearest standard value: <b id="lcStd">—</b> → actual current <b id="lcAct">—</b></p><p class="lcwarn" id="lcW"></p></div></div>
</div>
<p><b>The rule:</b> resistor = (battery voltage − LED voltage) ÷ current. With 5 V, a red LED (about 2 V) and 15 mA: (5 − 2) ÷ 0.015 = 200 Ω. Round up to the next standard value, 220 Ω, which gives about 13.6 mA. Most small LEDs are rated for about 20 mA.</p>
<p class="note">Based on the guidance in SparkFun's <i>Light-Emitting Diodes</i> and Adafruit's <i>All About LEDs</i> tutorials.</p>`,
  },
  {
    id: 'realworld', title: 'Memristors in the real world', blurb: 'Where resistive memory already ships, and the record-breaking lab chips.',
    html: `<p>Whatever you call them, resistive memory cells, the real-world memristors, are already in products.</p>
<ul class="rw">
<li><b>2013 · Panasonic</b> began mass-producing the first microcontrollers with built-in ReRAM (the MN101LR series).</li>
<li><b>2021–2023 · TSMC</b>, the world's largest chip foundry, put embedded RRAM into volume production at 40, 28 and 22 nm, with 12 nm in development. At 12 nm, one memory cell is about 0.025 µm², hundreds of times narrower than a human hair.</li>
<li><b>2022 · Infineon</b> announced its AURIX TC4x car microcontrollers would use TSMC's 28 nm RRAM.</li>
<li><b>2025 · Weebit Nano</b> reported its ReRAM passed the AEC-Q100 automotive qualification at 150 °C.</li>
</ul>
<p>And in the lab, memristor chips are doing AI:</p>
<ul class="rw">
<li><b>2022 · NeuRRAM</b> (Nature): 48 cores and about 3 million RRAM cells computing neural networks inside memory.</li>
<li><b>2023</b> (Nature): one memristor reliably held <b>2,048 distinct levels</b>, more than 11 bits in a single device.</li>
<li><b>Note:</b> IBM's well-known analog AI chips use <em>phase-change</em> memory, a related technology, not RRAM.</li>
</ul>
<p><b>Typical numbers</b> for today's embedded RRAM: data retention around 10 years at 85–125 °C, and 10,000–100,000 rewrites. Research cells reach far more, up to about a trillion cycles in some materials, with a trade-off between endurance and retention.</p>
<p class="note">Sources: Panasonic via phys.org (2013); TSMC annual reports 2023–24 and ISSCC 2024; Infineon press release (Nov 2022); Weebit Nano press release (Mar 2025); Wan et al., Nature 608 (2022); Rao et al., Nature 615 (2023). Figures are as reported by those sources.</p>`,
  },
  {
    id: 'names', title: 'The naming fight, explained', blurb: 'Why smart people disagree about whether memristors exist.',
    html: `<p>Imagine two people arguing about whether “a perfect circle” exists. One says: anything round enough to roll is a circle, so they're everywhere. The other says: a perfect circle is an exact mathematical shape, and nothing physical is exactly that. Both are right <em>about their own definition</em>.</p>
<p>The memristor fight is similar.</p>
<ul><li><b>The broad camp</b> (Chua and colleagues): any two-terminal device with a pinched v–i loop is a memristor. By that rule, the memory chips in this lab are memristors, and so are many other things.</li>
<li><b>The narrow camp</b> (Di Ventra, Pershin, Kish, Abraham, Vongehr and others): “memristor” means the ideal part whose resistance depends on charge alone. By that rule, none has been found, every real device tested so far fails the capacitor test, and it may be physically impossible.</li></ul>
<p>Nobody disputes the measurements. Both sides agree real chips are “a resistance with hidden dials”, and that we can simulate them well. The disagreement is about what deserves the name, and whether it counts as a new <em>fundamental</em> element alongside the resistor, capacitor and inductor.</p>`,
  },
  {
    id: 'timeline', title: 'Timeline, 1971–2026', blurb: 'Fifty-five years of claims, models and rebuttals.',
    html: `<ol class="tl"><li><b>1971</b> Chua proposes the memristor, f(q, φ) = 0.</li><li><b>1976</b> Chua &amp; Kang generalise it to memristive systems.</li><li><b>2008</b> HP Labs: “The missing memristor found” (TiO₂).</li><li><b>2009</b> Window functions, the Pickett tunnel model, memcapacitors and meminductors.</li><li><b>2011</b> Chua: “Resistance switching memories are memristors.”</li><li><b>2013–15</b> TEAM, Yakopcic, Stanford/PKU and VTEAM models. “If it's pinched it's a memristor.”</li><li><b>2015</b> Vongehr &amp; Meng: “The missing memristor has not been found.”</li><li><b>2017</b> NbO₂ Mott devices show chaos. Thermodynamic objections are raised.</li><li><b>2018</b> Abraham: reject it as a fundamental element. Pershin &amp; Di Ventra propose the capacitor test.</li><li class="bad"><b>2019</b> “Φ memristor: real memristor found.”</li><li class="bad"><b>Jan 2021</b> <span class="tag">Retracted</span></li><li><b>2020–22</b> Switching cells and the Φ device fail the capacitor test.</li><li class="meh"><b>2022</b> Nearly ideal magnetic film (field-driven, 90–120 K). Photonic quantum memristor (emulated).</li><li><b>2024–26</b> Neural-network compact models, stochastic models, edge-of-chaos models, electrothermal Pickett model.</li></ol>`,
  },
];

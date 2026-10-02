// Memristor Lab — plain-English definitions for every term and every part on the bench.
// d = for everyone (no jargon). x = an extra line shown in Technical mode.
// m = words in the text that should link to this entry (first match per block wins).

export const TERMS = {
  memristor: { t: 'Memristor', m: ['memristors?', 'memristive'], d: 'Short for “memory resistor”. A part whose resistance depends on how much electricity has flowed through it in the past, and which keeps that value when the power is off.', x: 'Ideal: v = M(q)·i. Memristive system: v = R(x, i)·i with dx/dt = f(x, i).' },
  ideal: { t: 'Ideal memristor', m: ['ideal memristor', 'perfect memristor', 'perfect version', 'perfect part'], d: 'The textbook version from Chua’s 1971 equation. Its resistance depends on one thing only: the total charge that has passed through it. Nobody has built one.', x: 'Charge-controlled: φ = φ̂(q), M(q) = dφ̂/dq. Equivalent flux-controlled form i = W(φ)·v.' },
  resistor: { t: 'Resistor', m: ['resistors?'], d: 'A part that makes it harder for electricity to flow, like a narrow section of pipe. It is used to limit current, for example to stop an LED burning out.', x: 'Linear: v = R·i. The one on the board is 220 Ω (bands red, red, brown, gold).' },
  resistance: { t: 'Resistance', m: ['resistance', 'memristance'], d: 'How hard it is for electricity to flow through something. It is measured in ohms (Ω). More resistance means less current for the same push.', x: 'R = v / i. Memristance M has the same unit, the ohm.' },
  ohm: { t: 'Ohm (Ω)', m: ['kΩ', 'Ω'], d: 'The unit of resistance. 1 kΩ (kilo-ohm) is 1,000 ohms.' },
  capacitor: { t: 'Capacitor', m: ['capacitors?'], d: 'A tiny charge bucket: two metal plates separated by an insulator. Current fills it up, and it can give the charge back later.', x: 'q = C·v. In the capacitor test it forces the device’s net charge back to zero.' },
  inductor: { t: 'Inductor', m: ['inductors?'], d: 'A coil of wire that stores energy in a magnetic field. It resists sudden changes in current, like a heavy flywheel resists changes in speed.', x: 'φ = L·i.' },
  voltage: { t: 'Voltage', m: ['voltages?', 'the push'], d: 'The “push” that drives electricity around a circuit, like water pressure in a pipe. It is measured in volts (V).', x: 'Potential difference; v = dφ/dt.' },
  volt: { t: 'Volt (V)', m: ['\\d+(?:\\.\\d+)? ?V\\b'], d: 'The unit of voltage. An AA battery gives about 1.5 V.' },
  current: { t: 'Current', m: ['current', 'the flow'], d: 'How much electricity flows past a point each second, like the amount of water flowing through a pipe. It is measured in amps (A). A milliamp (mA) is a thousandth of an amp.', x: 'i = dq/dt.' },
  charge: { t: 'Charge', m: ['charge'], d: 'The total amount of electricity that has flowed, added up over time. If current is the flow rate, charge is the total volume that has flowed.', x: 'q = ∫ i dt, in coulombs (C). 1 µC = one millionth of a coulomb.' },
  flux: { t: 'Flux (flux linkage)', m: ['flux linkage', 'flux'], d: 'Voltage added up over time. In a coil it is linked to magnetism, which is why some people think a true memristor needs magnetism too.', x: 'φ = ∫ v dt, in webers (V·s). Whether φ must be a physical magnetic flux is disputed.' },
  led: { t: 'LED', m: ['LEDs?', 'light-emitting diode'], d: 'Light-emitting diode. A tiny lamp that only lets electricity through one way. It needs about 2 V before it lights, and glows brighter with more current.', x: 'Forward voltage V_f ≈ 2 V. The two LEDs are wired back to back, so each lights for one current direction.' },
  breadboard: { t: 'Breadboard', m: ['breadboards?'], d: 'A white plastic board full of holes for building circuits without soldering. Under each short row of 5 holes is a metal clip that connects them. The long red (+) and blue (−) lines along the edges are the power rails.', x: 'Half-size, 400 tie points, 0.1" (2.54 mm) pitch; a–e and f–j strips are split by the centre trench.' },
  rail: { t: 'Power rail', m: ['power rails?', 'rails?'], d: 'The long rows of holes along the edges of a breadboard, marked + (red) and − (blue). Everything that needs power connects to them.' },
  battery: { t: 'Battery', m: ['battery', 'batteries', 'AA'], d: 'A store of chemical energy that pushes electricity out of its + end and back into its − end. Two AA cells give about 3 V.' },
  button: { t: 'Push button', m: ['push button', 'button'], d: 'A switch that only connects while you hold it down. Let go and the circuit is broken again.', x: '12 mm tactile switch, normally open.' },
  switch: { t: 'Direction switch', m: ['direction switch', 'switch'], d: 'A slide switch wired so that flipping it swaps which way the electricity flows through the black box.', x: 'DPDT slide switch wired as a polarity reverser: two crossed jumpers swap the outputs.' },
  jumper: { t: 'Jumper wire', m: ['jumpers?', 'jumper wires?', 'wires?'], d: 'A short insulated wire with bare metal ends that plug into breadboard holes to connect things.' },
  blackbox: { t: 'Black box “M?”', m: ['black box'], d: 'A sealed stand-in for a part that does not exist yet. We programmed it to behave exactly like Chua’s perfect memristor, so you can see what one would do in a real circuit.', x: 'Logistic M(q): R_on = 100 Ω, R_off = 10 kΩ.' },
  chua: { t: 'Leon Chua', m: ['Leon Chua', 'Chua'], d: 'An electrical engineer at UC Berkeley who predicted the memristor in 1971 and has argued for a broad definition of it ever since.' },
  element: { t: 'Circuit element', m: ['circuit elements?', 'basic parts', 'fundamental element', 'fourth basic circuit element', 'element'], d: 'One of the basic building blocks of electronics, such as a resistor, capacitor or inductor. Chua proposed the memristor as a fourth.' },
  electrode: { t: 'Electrode', m: ['electrodes?', 'metal strips?'], d: 'A metal contact that lets electricity into or out of a material. Here, two metal bars sandwich the oxide.', x: 'Top: platinum (Pt). Bottom: titanium nitride (TiN). A crossbar cell sits where they cross.' },
  oxide: { t: 'Oxide', m: ['oxides?', 'glass block', 'HfO₂', 'TiO₂', 'TiO2'], d: 'A material made of a metal bonded to oxygen, like rust or sapphire. Thin oxide layers are normally insulators, but missing oxygen atoms can make them conduct.', x: 'HfOₓ, TaOₓ and TiO₂ are the common switching oxides.' },
  filament: { t: 'Filament', m: ['filaments?', 'glowing thread', 'thread'], d: 'A very thin conducting thread that grows inside the oxide when a voltage pulls oxygen atoms out. When it nearly touches the far electrode, resistance drops sharply.', x: 'State variable: the tunnelling gap g between the filament tip and the electrode.' },
  vacancy: { t: 'Oxygen vacancy', m: ['oxygen vacanc(?:y|ies)', 'vacanc(?:y|ies)', 'holes they leave behind'], d: 'An empty spot where an oxygen atom should be. A chain of them conducts electricity, which is what the filament is made of.' },
  ion: { t: 'Ion', m: ['ions?', 'oxygen atoms?'], d: 'An atom with an electric charge, so a voltage can push or pull it. Here, negatively charged oxygen ions get pulled toward the positive electrode.' },
  tunnelling: { t: 'Tunnelling', m: ['tunnell?ing', 'jump the last tiny'], d: 'A quantum effect where electrons hop across a tiny gap they could not normally cross. The smaller the gap, the more of them get through. It only works over about a nanometre.' },
  gap: { t: 'Gap g', m: ['gap'], d: 'The tiny space between the tip of the filament and the electrode, about one nanometre. A smaller gap means lower resistance.' },
  nm: { cs: 1, t: 'Nanometre (nm)', m: ['nanomet(?:re|er)s?', 'nm'], d: 'A billionth of a metre, about the width of five atoms.' },
  threshold: { t: 'Threshold', m: ['thresholds?'], d: 'A minimum voltage below which nothing changes. It lets you read a memory cell gently without accidentally rewriting it.' },
  loop: { t: 'Pinched loop (bow tie)', m: ['pinched loops?', 'pinched hysteresis loop', 'bow ties?', 'pinched'], d: 'The shape you get when you plot voltage against current for a part with memory. It crosses itself in the middle because zero voltage always means zero current.', x: 'Pinched hysteresis in the v–i plane: necessary for a memristor, not sufficient.' },
  hysteresis: { t: 'Hysteresis', m: ['hysteresis'], d: 'When a system’s response depends on its history, so going up and coming back down follow different paths. It is a sign of memory.' },
  scope: { t: 'Oscilloscope (scope)', m: ['oscilloscope', 'scope', 'screen on the right'], d: 'An instrument that draws electrical signals as live graphs. Here it plots voltage (left to right) against current (up and down).' },
  frequency: { t: 'Frequency', m: ['frequency', 'frequencies', 'Hz', 'kHz'], d: 'How many times per second the voltage wiggles back and forth, measured in hertz (Hz). 1 kHz is 1,000 times a second.' },
  amplitude: { t: 'Amplitude', m: ['amplitude'], d: 'How big the wiggle is: the highest voltage the wave reaches.' },
  sine: { t: 'Sine wave', m: ['sine waves?', 'sine', 'sinusoidal'], d: 'A smooth, regular up-and-down wave, like a swing moving back and forth.' },
  state: { t: 'Hidden dial (state variable)', m: ['hidden dial', 'state variables?', 'internal states?', 'state'], d: 'The thing inside a device that remembers, for example the length of a filament or the temperature. Current turns the dial, and the dial sets the resistance.', x: 'x in v = R(x, i)·i, dx/dt = f(x, i).' },
  window: { t: 'Window function', m: ['window functions?', 'windows?', 'brake'], d: 'A mathematical “brake” added to the HP model to stop the conducting layer moving past the edges of the film.', x: 'Joglekar, Biolek, Prodromakis and others. Many cause boundary lock or ill-posed simulations.' },
  lock: { t: 'Boundary lock', m: ['boundary lock'], d: 'A flaw in some window functions: once the state reaches an edge it can never come back, even when the current reverses.' },
  hp: { cs: 1, t: 'HP Labs 2008', m: ['HP Labs', 'HP’s', "HP's", 'HP'], d: 'The Hewlett-Packard research team whose 2008 paper “The missing memristor found” sparked worldwide interest. Their simple model is now considered too simple.' },
  rram: { t: 'RRAM / ReRAM', m: ['RRAM', 'ReRAM', 'memory chips?', 'memory cells?'], d: 'Resistive random-access memory: a memory chip that stores bits as high or low resistance in tiny oxide cells. These are the real-world “memristors”.' },
  pcm: { t: 'Phase-change memory', m: ['phase-change', 'how crystalline'], d: 'Memory that stores bits by melting a tiny spot of material and letting it cool as glass-like (high resistance) or crystal (low resistance).' },
  spin: { t: 'Spintronic', m: ['spintronic', 'magnet direction'], d: 'Electronics that uses the magnetism of electrons as well as their charge. The memory is which way a tiny magnet points.' },
  mott: { cs: 1, t: 'Mott transition', m: ['Mott', 'NbO₂', 'NbO2', 'VO₂'], d: 'When a material suddenly switches from insulator to metal as it heats up. Niobium dioxide (NbO₂) does this at about 800 °C.' },
  ndr: { t: 'Negative differential resistance', m: ['negative differential resistance', 'negative-resistance', 'S-shaped'], d: 'A strange region where pushing harder makes the voltage drop while more current flows. It makes circuits oscillate or spike.' },
  neuron: { t: 'Neuron-like spiking', m: ['neurons?', 'nerve cell', 'spik(?:e|es|ing)', 'fires', 'blink(?:ing|s)?'], d: 'Short bursts of activity separated by quiet periods, like the electrical pulses brain cells use. Some memristive devices do this naturally.' },
  chaos: { t: 'Chaos', m: ['chaos', 'chaotic', 'edge of chaos'], d: 'Behaviour that follows exact rules yet never repeats and is impossible to predict far ahead, like weather.' },
  active: { t: 'Active vs passive', m: ['active', 'passive'], d: 'A passive part can only use up or store energy, like a resistor. An active part can add energy to a signal, like an amplifier. A true memristor should be passive.', x: 'Passivity is disputed: Wyatt–Chua (M(q) > 0) versus a thermodynamic definition.' },
  captest: { t: 'Capacitor test', m: ['capacitor test', 'memristor test', 'the test'], d: 'A fair check proposed in 2018. Put the device in series with a capacitor, push charge in, and let it drain out again. A true memristor must end at exactly its starting resistance.', x: 'q_M(t) − q_M(0) = q_C(t) − q_C(0). Pass band ±10%.' },
  ferrite: { t: 'Ferrite core', m: ['ferrite', 'magnetic ring', 'core', 'ring'], d: 'A ring of magnetic ceramic. Current in a wire through the ring can magnetise it one way or the other, and it stays that way.' },
  magnet: { t: 'Magnetisation', m: ['magneti[sz]ation', 'magnetism', 'magnetic'], d: 'Which way, and how strongly, a material is magnetised: in effect, the direction a tiny compass inside it points.' },
  retraction: { t: 'Retraction', m: ['retract(?:ed|ion)', 'withdrew'], d: 'When a journal officially withdraws a published paper because its conclusions can’t be trusted.' },
  thermo: { t: 'Second law of thermodynamics', m: ['thermodynamic(?:s|ally)?', 'Second Law', 'heat jiggles'], d: 'A basic law of physics: you can’t get useful work out of random heat for free. Some argue a perfect memristor would break it.' },
  model: { t: 'Compact model', m: ['compact models?', 'models?'], d: 'A set of equations that mimics how a device behaves, simple enough for circuit-design software to run quickly.', x: 'e.g. JART VCM, Stanford/PKU, VTEAM, Yakopcic; usually written in Verilog-A.' },
  heat: { t: 'Self-heating', m: ['self-heating', 'heats (?:itself|up)', 'Joule'], d: 'Current flowing through something warms it, like a toaster wire. In memristors the heat speeds up the atoms’ movement.', x: 'T = T₀ + V·I·R_th.' },
  kelvin: { cs: 1, t: 'Kelvin (K)', m: ['K\\b', 'kelvin'], d: 'A temperature scale starting at absolute zero. 300 K is about room temperature (27 °C); 1070 K is about 800 °C.' },
  crossbar: { t: 'Crossbar cell', m: ['crossbar'], d: 'A memory cell formed where two metal lines cross, with a thin layer of oxide between them. Chips pack millions in a grid.' },
  probe: { t: 'Probe needle', m: ['probes?'], d: 'A sharp metal needle on an arm, used in labs to touch tiny contacts on a chip and apply voltage.' },
  bench: { t: 'Lab bench', m: ['bench'], d: 'The work surface. The dark grid mat is anti-static, so it protects delicate chips from sparks.' },
  dilemma: { t: 'Voltage–time dilemma', m: ['voltage–time dilemma', 'voltage-time dilemma'], d: 'A memory cell must not change when read gently for years, yet must switch in nanoseconds when written. Memristive cells manage this because their switching speed changes enormously with voltage.' },
  variability: { t: 'Variability', m: ['variability', 'random variation'], d: 'Real devices never behave exactly the same twice, because atoms move a little randomly each time.' },
  squid: { cs: 1, t: 'SQUID', m: ['SQUID', 'superconducting'], d: 'A superconducting quantum interference device: an ultra-sensitive superconducting loop. Theory says an asymmetric one could be a perfect memristor.' },
  log: { t: 'Log scale', m: ['log(?:arithmic)? scale', 'log \\|'], d: 'A graph scale where each step up is ten times bigger than the last. It lets tiny and huge numbers share one graph.' },

  strip: { t: 'Component strip', m: ['component strips?', 'strips?', 'metal clips?', 'spring clips?'], d: 'Inside a breadboard, a springy metal clip under 5 holes in a row. Anything plugged into those 5 holes is connected together.' },
  trench: { t: 'Centre trench', m: ['centre trench', 'trench', 'groove'], d: 'The groove down the middle of a breadboard. It separates the two halves so a chip or button can sit across it without its legs being shorted together.' },
  tie: { t: 'Tie point', m: ['tie points?'], d: 'One hole on a breadboard. A “400 tie point” board has 400 holes.' },
  pitch: { t: 'Pitch', m: ['pitch'], d: 'The spacing between neighbouring holes or pins. Breadboards use 0.1 inch (2.54 mm).' },
  series: { t: 'In series', m: ['in series', 'series'], d: 'Connected one after another in a single loop, so the same current flows through each part.' },
  anode: { t: 'Anode and cathode', m: ['anode', 'cathode'], d: 'The + and − ends of a diode or LED. On an LED the longer leg is the anode (+).' },
  forward: { t: 'Forward voltage', m: ['forward voltage', 'V_f'], d: 'The minimum push an LED or diode needs before current starts to flow through it: about 2 V for a red or green LED.' },
  polarity: { t: 'Polarity', m: ['polarity', 'polarities'], d: 'Which way round the + and − are. Reversing polarity makes current flow the other way.' },
  dpdt: { cs: 1, t: 'DPDT switch', m: ['DPDT'], d: 'Double-pole, double-throw: two switches in one body that flip together. Handy for reversing the direction of current.' },
  tactile: { t: 'Tactile switch', m: ['tactile switch', 'tactile'], d: 'The small clicky push button found on circuit boards. It connects only while pressed.' },
  vcm: { cs: 1, t: 'Valence-change memory (VCM)', m: ['VCM', 'valence-change', 'valence change'], d: 'A kind of RRAM where missing oxygen atoms move around inside an oxide to change its resistance.' },
  ecm: { cs: 1, t: 'ECM / CBRAM', m: ['ECM', 'CBRAM', 'electrochemical metallization', 'Ag-chalcogenide', 'chalcogenide'], d: 'A kind of RRAM where a thin thread of metal (copper or silver) grows and dissolves between the electrodes.' },
  jart: { cs: 1, t: 'JART VCM model', m: ['JART VCM', 'JART'], d: 'A widely used, carefully tested computer model of oxide memory cells from Jülich in Germany. It tracks how many oxygen vacancies sit in a tiny disc at the electrode.' },
  stanford: { t: 'Stanford/PKU model', m: ['Stanford/PKU', 'Stanford'], d: 'A popular computer model of filament-type RRAM in which the hidden dial is the width of the gap at the filament tip.' },
  vteam: { cs: 1, t: 'TEAM / VTEAM', m: ['V-VTEAM', 'VTEAM', 'TEAM'], d: 'Fast, simplified memristor models with a switching threshold, from the Technion in Israel. Popular for designing circuits quickly.' },
  yakopcic: { t: 'Yakopcic model', m: ['Yakopcic'], d: 'A flexible “fit-anything” memristor model, tuned to match measurements from many device types.' },
  pickett: { t: 'Pickett / Simmons model', m: ['Pickett', 'Simmons'], d: 'HP’s 2009 model in which electrons tunnel through a thin barrier whose width changes. Accurate but slow to simulate.' },
  schottky: { t: 'Schottky barrier', m: ['Schottky barrier', 'Schottky'], d: 'An energy “step” where a metal touches a semiconductor. Electrons must climb it to flow, so changing its height changes the resistance.' },
  arrhenius: { t: 'Thermally activated (Arrhenius)', m: ['Arrhenius', 'thermally activated', 'activation energy', 'E_a'], d: 'Describes processes that speed up enormously as things get hotter, because more atoms have enough energy to hop over a barrier.' },
  sinh: { t: 'sinh (hyperbolic sine)', m: ['sinh'], d: 'A maths function that grows explosively. It appears because a voltage makes atom hops one way much easier and the other way harder.' },
  verilog: { t: 'Verilog-A / SPICE', m: ['Verilog-A', 'SPICE', 'Cadence Spectre', 'harmonic balance'], d: 'Software engineers use to simulate circuits before building them. Device models are written in the Verilog-A language.' },
  wellposed: { t: 'Well-posed model', m: ['well-posed', 'ill-posed'], d: 'A model whose maths always gives exactly one sensible answer. Ill-posed models can crash circuit simulators or give conflicting answers.' },
  pinn: { cs: 1, t: 'Physics-informed neural network', m: ['physics-informed neural networks?', 'PINN', 'neural-network compact models?', 'neural network'], d: 'An AI model trained to follow known physics equations, used to make device simulations faster.' },
  llg: { cs: 1, t: 'LLG equation', m: ['LLG', 'Landau-Lifshitz-Gilbert'], d: 'The equation describing how a tiny magnet inside a material swings and settles when pushed.' },
  jmak: { cs: 1, t: 'JMAK (Avrami) kinetics', m: ['JMAK', 'Avrami'], d: 'A formula for how quickly a material turns from glassy to crystal as it is heated.' },
  hh: { t: 'Hodgkin–Huxley model', m: ['Hodgkin–Huxley', 'Hodgkin-Huxley'], d: 'The 1952 Nobel-winning description of how electrical spikes travel along nerve cells. In Chua’s framework its ion channels count as memristive systems.' },
  thermistor: { t: 'Thermistor', m: ['thermistors?', 'light bulb', 'discharge tubes?', 'neon tube'], d: 'A resistor whose resistance changes with temperature. Because it remembers how hot it is, it also draws a bow-tie loop.' },
  fdt: { t: 'Fluctuation–dissipation theorem', m: ['fluctuation–dissipation', 'fluctuation-dissipation'], d: 'A rule of physics: anything that turns electrical energy into heat must also produce random electrical noise.' },
  onetr: { cs: 1, t: '1T1R / 1S1R cell', m: ['1T1R', '1S1R', 'selector'], d: 'A memory cell made of one transistor (or selector) plus one resistive element. The transistor acts as a gate and current limiter.' },
  neuromorphic: { t: 'Neuromorphic computing', m: ['neuromorphic', 'brain-like', 'brain-inspired'], d: 'Computer chips designed to work a bit like brains, with many simple “neurons” and adjustable connections.' },
  inmem: { t: 'In-memory computing', m: ['in-memory', 'computing inside memory'], d: 'Doing calculations right where the data is stored, instead of shuttling it back and forth to a processor.' },
  synapse: { t: 'Synapse', m: ['synapses?'], d: 'The connection between two nerve cells. Its strength changes as we learn, a bit like a memristor’s resistance.' },
  nonvolatile: { t: 'Non-volatile', m: ['non-volatile', 'nonvolatile', 'volatile'], d: 'Non-volatile memory keeps its data with the power off. Volatile memory forgets.' },
  setreset: { cs: 1, t: 'SET and RESET', m: ['SET', 'RESET'], d: 'SET switches a memory cell to low resistance (ON). RESET switches it back to high resistance (OFF).' },
  forming: { t: 'Forming', m: ['forming', 'electroforming'], d: 'A one-time, extra-strong first pulse that creates the very first filament in a brand-new cell.' },
  rtn: { cs: 1, t: 'Random telegraph noise', m: ['random telegraph noise', 'telegraph noise', 'RTN'], d: 'Current that flicks between two levels as a single atom or defect hops back and forth. It sounds like an old telegraph.' },
  d2d: { cs: 1, t: 'D2D / C2C variability', m: ['D2D', 'C2C', 'device-to-device', 'cycle-to-cycle'], d: 'Device-to-device: no two cells are identical. Cycle-to-cycle: the same cell behaves a bit differently every time it switches.' },
  coercive: { t: 'Coercive', m: ['coercive'], d: 'The strength of push needed to flip a magnet’s direction.' },
  retention: { t: 'Retention and endurance', m: ['retention', 'endurance'], d: 'Retention is how long a stored value lasts. Endurance is how many times a cell can switch before wearing out. Drift is a slow creep of the value over time.' },
  compliance: { t: 'Compliance current', m: ['compliance current', 'compliance'], d: 'A current limit applied while switching a cell, to stop it overheating and to set how strongly it switches ON.' },
  nonlinear: { t: 'Nonlinear', m: ['nonlinear', 'nonlinearity', 'linear'], d: 'In a linear system, doubling the input doubles the output. A nonlinear system does something more complicated, which is where interesting behaviour comes from.' },
  slope: { t: 'Slope', m: ['slope', 'steepness', 'derivative'], d: 'How steep a graph is at a point: how much one quantity changes for a small change in another.' },
  integral: { t: 'Integral (∫)', m: ['integral', 'running total', 'integrates?', 'added up over time'], d: 'A running total. ∫ i dt means “add up the current over time”, which gives the total charge.' },
  constitutive: { t: 'Constitutive relation', m: ['constitutive relations?', 'constitutive curve', 'constitutive'], d: 'The single equation that defines how a type of part behaves, for example v = R·i for a resistor.' },
  loadline: { t: 'Load line', m: ['load line'], d: 'A straight line showing every combination of voltage and current that the rest of the circuit allows.' },
  oscillator: { t: 'Relaxation oscillator', m: ['relaxation oscillat(?:or|ion)', 'Pearson–Anson', 'oscillat(?:e|es|ion|ions)'], d: 'A circuit that slowly charges up, suddenly discharges, and repeats, like a dripping tap. It makes regular pulses.' },
  photonic: { t: 'Photonic', m: ['photonic'], d: 'Using light instead of electricity to carry signals.' },
  quantum: { t: 'Quantum', m: ['quantum'], d: 'The physics of very small things, where particles behave like waves and can tunnel through barriers.' },
  emulator: { t: 'Emulator', m: ['emulators?', 'emulated'], d: 'A circuit that imitates a memristor using transistors and amplifiers. It needs its own power, so it is active, not a true passive memristor.' },
  blocking: { t: 'Blocking temperature', m: ['blocking temperature'], d: 'The temperature below which the tiny magnets in a material freeze in place.' },
  permalloy: { t: 'Permalloy and NiO', m: ['permalloy', 'NiO'], d: 'Permalloy is an easily magnetised nickel–iron alloy. NiO (nickel oxide) is a material whose atomic magnets point in alternating directions.' },
  amr: { t: 'Anisotropic magnetoresistance', m: ['anisotropic magnetoresistance', 'magnetoresistance'], d: 'A material’s resistance changing with the direction it is magnetised. It is used to “read” a magnet electrically.' },
  fcam: { cs: 1, t: 'Flux–charge analysis method', m: ['FCAM', 'flux–charge analysis', 'flux-charge analysis'], d: 'A way of analysing memristor circuits by writing everything in terms of flux and charge instead of voltage and current.' },
  bifurcation: { t: 'Bifurcation', m: ['bifurcations?'], d: 'A sudden change in a system’s behaviour, like a calm circuit starting to oscillate, as something is gradually adjusted.' },
  localact: { t: 'Local activity', m: ['local activity', 'locally active', 'local-activity'], d: 'Chua’s term for parts that can amplify a tiny nudge in some operating range. He argues complex, lifelike behaviour needs it.' },
  kT: { cs: 1, t: 'kT (thermal energy)', m: ['kT'], d: 'The typical jiggle energy of atoms at temperature T. At room temperature it is about 0.026 eV.' },
  ev: { cs: 1, t: 'Electron-volt (eV)', m: ['eV'], d: 'A tiny unit of energy used for atoms and electrons: the energy one electron gains crossing 1 volt.' },
  metals: { cs: 1, t: 'Platinum (Pt) and titanium nitride (TiN)', m: ['Pt', 'TiN', 'platinum', 'titanium nitride'], d: 'Two metals commonly used for the electrodes of memory cells. Platinum doesn’t react easily; titanium nitride is tough and cheap in chip factories.' },
  hafnium: { cs: 1, t: 'Hafnium / tantalum oxide', m: ['HfOₓ', 'HfOx', 'TaOₓ', 'TaOx', 'HfO2'], d: 'Oxides already used in chip factories. A few nanometres of them make the switching layer of modern RRAM.' },
  peer: { t: 'Peer review', m: ['peer-reviewed', 'peer review'], d: 'Checking by independent experts before a paper is published.' },
  replication: { t: 'Replication', m: ['replications?', 'independent repeats'], d: 'Another lab repeating an experiment to check the result holds up.' },
  ohmslaw: { t: 'Ohm’s law', m: ['Ohm’s law', "Ohm's law"], d: 'Current = voltage ÷ resistance. The most basic rule of electronics.' },
  kirchhoff: { t: 'Kirchhoff’s current law', m: ['Kirchhoff’s law', "Kirchhoff's law", 'Kirchhoff'], d: 'Currents flowing into a junction add up, because charge can’t pile up or vanish at a point in a wire.' },
  schematic: { t: 'Circuit diagram (schematic)', m: ['circuit diagrams?', 'schematics?', 'diagram'], d: 'A map of a circuit using standard symbols. It shows what connects to what, not where parts physically sit.' },
  mvm: { t: 'Matrix–vector multiplication', m: ['matrix–vector multiplication', 'multiply-and-add', 'multiply-add'], d: 'Multiplying lists of numbers by a table of weights and adding the results. It is the core arithmetic of AI.' },
  tolerance: { t: 'Tolerance', m: ['tolerance'], d: 'How far a part’s real value may be from its label. ±5% on a 220 Ω resistor means 209–231 Ω.' },
  multiplier: { t: 'Multiplier band', m: ['multiplier'], d: 'On a resistor, the third colour band says how many zeros to add after the first two digits.' },
  mem: { t: 'Memcapacitor / meminductor', m: ['memcapacitors?', 'meminductors?', 'mem-elements?'], d: 'Capacitors and inductors with memory: the cousins of the memristor proposed in 2009.' },
  chuakang: { t: 'Memristive system', m: ['memristive systems?'], d: 'Chua and Kang’s 1976 generalisation: any device whose resistance depends on hidden internal states. Every real memory cell fits this.' },
};

/* ── link terms inside a container (first occurrence per block) ── */
const SKIP = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'BUTTON', 'LABEL', 'OUTPUT', 'SVG', 'TEXT', 'A', 'TH', 'INPUT', 'VAR', 'SUB', 'SUP']);
let RX = null;
function build() {
  const alts = [];
  for (const k in TERMS) for (const m of TERMS[k].m) alts.push([m, k]);
  alts.sort((a, b) => b[0].length - a[0].length);
  RX = { re: new RegExp('(?<![\\w-])(' + alts.map((a) => a[0]).join('|') + ')(?![\\w-])', 'i'), alts: alts.map(([m, k]) => [new RegExp('^(?:' + m + ')$', TERMS[k].cs ? '' : 'i'), k]) };
}
const BLOCKS = 'p, li, td, figcaption, summary, .cards3 > div > span, .pgrid section > p, .ge > p';
export function autoLink(root) {
  if (!RX) build();
  if (!root) return;
  const blocks = [...(root.matches && root.matches(BLOCKS) ? [root] : []), ...root.querySelectorAll(BLOCKS)];
  for (const b of blocks) {
    // every paragraph links its own jargon, so a dotted definition is never far away
    const seen = new Set([...b.querySelectorAll('.term')].map((t) => t.dataset.t));
    const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        for (let e = n.parentElement; e && e !== b.parentElement; e = e.parentElement) {
          if (SKIP.has(e.tagName.toUpperCase()) || e.classList.contains('eqblock') || e.classList.contains('eq') || e.classList.contains('term') || e.classList.contains('kicker') || e.classList.contains('nolink')) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue; let m, frag = null, last = 0;
      const re = new RegExp(RX.re.source, 'gi');
      while ((m = re.exec(text))) {
        const word = m[1];
        const hit = RX.alts.find(([r]) => r.test(word));
        if (!hit) continue;
        const key = hit[1];
        if (seen.has(key)) continue;
        seen.add(key);
        frag ||= document.createDocumentFragment();
        frag.append(text.slice(last, m.index));
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'term'; btn.dataset.t = key; btn.textContent = word;
        frag.append(btn);
        last = m.index + word.length;
      }
      if (frag) { frag.append(text.slice(last)); node.replaceWith(frag); }
    }
  }
}

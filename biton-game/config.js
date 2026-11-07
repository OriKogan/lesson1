/* =====================================================================
   BITON: THE RECKONING — config.js
   ---------------------------------------------------------------------
   All names, jokes, dialogue and level settings live here, so you can
   change them without touching the game engine.

   - Rename anyone: change `name` below.
   - Level numbers: hp = boss health, aggression 0..1, block 0..1,
     dmg = how hard the boss hits (1 = normal).
   ===================================================================== */

const PLAYER = {
  name: 'YOU',
  face: null, // e.g. 'assets/faces/me.png'
  look: { skin: '#e9b48f', hair: '#2a1a12', hairStyle: 'swoop', shirt: '#e23b3b', shirtMark: 'star', pants: '#2b3a67', shoes: '#f5f5f5', shades: true },
  taunts: [
    'Is that all you got?',
    'My grandma hits harder. She\'s 90.',
    'You fight like a wet sock.',
    'Yawn.',
    'Bro, are you lagging?',
    'I\'ve been hit harder by a pillow.',
    'Are you even trying?',
    'Call your mom, tell her you lost.',
  ],
};

const CHARACTERS = {
  biton: {
    name: 'BITON',
    face: null, // Biton stays a cartoon
    look: { skin: '#dba27c', hair: '#1d120c', hairStyle: 'messy', cap: '#d33', shirt: '#2f6fd6', shirtMark: 'B', pants: '#3a3a3a', shoes: '#ffffff' },
    taunts: ['Too easy!', 'I\'m not even using my good hand.', 'EZ.', 'You\'re done, achi!', 'Bro I\'m half asleep.'],
    hurtLines: ['That didn\'t count!', 'LAG!', 'Ow! Ow! Okay!', 'I WASN\'T READY!'],
    tiltLines: ['OH YOU\'RE DEAD NOW.', 'Say that again. I dare you.', 'I\'m telling everyone you cheated.'],
  },
  hat: {
    name: 'SIR HAT-A-LOT',
    face: 'assets/faces/hat.png',
    look: { skin: '#f0c4a4', shirt: '#151515', shirtMark: 'eye', pants: '#1c1c1c', shoes: '#eeeeee', bracelet: true },
    taunts: ['Respect the hat.', 'Hat game: strong. Your game: weak.', 'You just got hat-tricked.', 'Smile for the camera!'],
    hurtLines: ['NOT THE HAT!', 'My glasses!', 'Rude.'],
    tiltLines: ['Did you just disrespect THE HAT?', 'The hat is angry now.'],
  },
  shook: {
    name: 'MR. SHOOK',
    face: 'assets/faces/shook.png',
    look: { skin: '#d9a98a', shirt: '#d8cfbf', shirtMark: 'knit', pants: '#2a2a2a', shoes: '#ffffff', backpack: true, watch: true },
    taunts: ['WHAAAT?!', 'DID YOU SEE THAT?!', 'BRO NO WAY!', 'I\'M SHOOK!'],
    hurtLines: ['WHAT?!', 'HOW?!', 'NO WAY!'],
    tiltLines: ['I\'M EXTRA SHOOK NOW!', 'WHAT DID YOU JUST SAY?!'],
  },
  silan: {
    name: 'THE SILAN SOMMELIER',
    face: 'assets/faces/silan.png',
    look: { skin: '#e8b090', shirt: '#141414', shirtMark: 'ship', pants: '#30333a', shoes: '#ffffff' },
    taunts: ['Have you tried it though?', '100% dates!', 'It\'s basically a vegetable.', 'Sweet, like victory.'],
    hurtLines: ['Careful! The jar!', 'Not the silan!', 'Sticky situation!'],
    tiltLines: ['You insulted the silan. You insulted ME.', 'No silan for you. EVER.'],
  },
  monk: {
    name: 'THE HYDRATION MONK',
    face: 'assets/faces/monk.png',
    look: { skin: '#d4a07e', shirt: '#f2f1ec', shirtMark: 'chain', pants: '#121212', shoes: '#1b1b1b' },
    // The Monk talks out loud (text-to-speech) in a flat robot voice. Set voice: null to turn off.
    voice: { pitch: 0.2, rate: 0.75 },
    taunts: ['Hydrate.', 'I am calm.', 'Water is patient.', 'You are thirsty. I can tell.', 'Sip.'],
    hurtLines: ['Okay.', 'That was a hit.', 'I felt that. Slightly.'],
    tiltLines: ['I am... mildly annoyed.', 'My expression has not changed. But inside, I am furious.'],
  },
};

/* Thrown by Biton from Level 2. They are words. They hurt. */
const EXCUSES = ['LAG!', 'MY HAND SLIPPED', 'WASN\'T READY', 'DOESN\'T COUNT', 'SUN IN MY EYES', 'BROKEN CONTROLLER', 'MY MOM CALLED', 'I WAS AFK'];

const HIT_WORDS = ['POW!', 'BONK!', 'WHAM!', 'SMACK!', 'BOP!', 'OOF!', 'THWACK!', 'BAM!', 'YEET!', 'KAPOW!'];

/* Combo counter titles (hits in a row without getting hit). */
const COMBO_TITLES = [[2, 'NICE'], [3, 'RUDE'], [5, 'UNCALLED FOR'], [7, 'DISRESPECTFUL'], [9, 'CALL HIS MOM'], [12, 'FRIENDSHIP OVER'], [15, 'PLEASE STOP'], [20, 'HE HAS A FAMILY']];

const OFFER_LINES = ['You HAVE to try this.', 'Just one spoon. ONE.', '100% dates, bro!', 'It\'s healthy, I swear.', 'Open wide!'];
const INFOMERCIAL_LINES = ['But wait, there\'s MORE!', 'Call NOW!', 'Tired of NOT having silan?', 'Order two, get a third jar FREE!', 'Doctors HATE this jar!', 'Operators are standing by!'];
const LECTURE_LINES = ['You should be drinking right now.', 'Have you had eight cups today.', 'Water is life. You are not.', 'Hydration is a lifestyle.', 'Thirst is a choice.'];
const LECTURE_WORDS = ['DRINK', 'WATER', '8 CUPS', 'DAILY', 'SIP', 'H2O', 'THIRST'];
const FLOOR_NAMES = ['FLOOR 2: PARKING (NO PARKING)', 'FLOOR 4: HR. THEY KNOW.', 'FLOOR 6: THE GYM NOBODY USES', 'FLOOR 8: SILAN STORAGE', 'FLOOR 11: BITON\'S EXCUSE DEPT.', 'FLOOR 13: DOES NOT EXIST', 'FLOOR 21: HAT WAREHOUSE', 'FLOOR 99: HYDRATION HEAVEN'];

const TITLE_JOKES = ['Not endorsed by Biton.', 'Biton says this game is rigged.', 'Hydrate before playing.', 'Now with 300% more friends.', 'Contains silan. Lots of it.', 'No hats were harmed. Okay, a few.'];

const LOSE_TIPS = [
  'TIP: Try hitting him.',
  'TIP: Blocking exists. Hold S.',
  'TIP: Taunting (T) fills your slipper meter. Disrespect is a resource.',
  'TIP: Full meter + L = call his mom.',
  'TIP: The yellow bar is YOUR health. Keep it yellow.',
  '{boss} is posting this in the group chat right now.',
  'Even Biton beat this level. Probably.',
  'TIP: Kicks hit people lying on the floor. Just saying.',
];

const RANKS = [
  [0.85, 'S', 'FLAWLESS DISRESPECT'],
  [0.65, 'A', 'CLEAN. VERY CLEAN.'],
  [0.45, 'B', 'NOT BAD AT ALL'],
  [0.25, 'C', 'A LITTLE SWEATY'],
  [0, 'D', 'HE WILL SAY HE WAS LAGGING'],
];

/* ---------------------------------------------------------------------
   CHAPTERS & LEVELS
   who in dialogue: 'n' = narrator, 'p' = player, or a character key.
   --------------------------------------------------------------------- */
const CHAPTERS = [
  {
    title: 'CHAPTER 1', subtitle: 'BITON', bosses: ['biton'], music: 'biton',
    levels: [
      {
        name: 'RECESS RUMBLE', stage: 'schoolyard', enemies: ['biton'], hp: 90, aggression: 0.3, block: 0.12, dmg: 0.75,
        mods: { phone: true, tutorial: true },
        intro: [
          ['n', 'It has been a long time coming.'],
          ['biton', 'Bro. You really think you can beat me?'],
          ['p', 'I KNOW I can beat you.'],
          ['biton', 'Fine. But if I lose, I was lagging.'],
          ['p', 'We\'re not even playing a video game.'],
          ['biton', '...Lagging in real life. It\'s a thing.'],
        ],
        defeat: 'I was lagging. In real life.',
        gloat: 'HAHA! Told you. Biton never loses!',
      },
      {
        name: 'BITON IS MAD NOW', stage: 'schoolyard', variant: 'sunset', enemies: ['biton'], hp: 110, aggression: 0.45, block: 0.22, dmg: 0.9,
        mods: { excuses: true, flop: true },
        intro: [
          ['biton', 'That didn\'t count. My shoelace was untied.'],
          ['p', 'You\'re wearing slides.'],
          ['biton', 'EXACTLY. No support. Rematch.'],
          ['n', 'Biton has unlocked: EXCUSES. They hurt. Physically.'],
          ['n', 'TIP: If he flops on the floor, he\'s faking. Kick him.'],
        ],
        defeat: 'My knee! Ref! REF!',
        gloat: 'The excuses worked! They ALWAYS work!',
      },
      {
        name: 'ULTRA BITON', stage: 'schoolyard', variant: 'ultra', enemies: ['biton'], hp: 130, aggression: 0.6, block: 0.3, dmg: 1.05,
        mods: { excuses: true, ultra: true, rageQuit: true }, music: 'ultra',
        intro: [
          ['n', 'Biton has been training. (He watched one video.)'],
          ['biton', 'I have transcended. I am... ULTRA BITON.'],
          ['p', 'Did you just put "ultra" in front of your name?'],
          ['biton', 'AND I GOT A HAIRCUT. FEAR ME.'],
          ['n', 'TIP: If he tries to rage quit, chase him!'],
        ],
        defeat: 'Okay... maybe I wasn\'t lagging.',
        gloat: 'ULTRA BITON IS UNSTOPPABLE!',
      },
    ],
    roast: {
      options: [
        ['You lose so much, your excuses have excuses.', 'I was lagging when you said that.'],
        ['Even your shadow asked to be traded to another team.', 'My shadow is LOYAL. ...right, shadow?'],
        ['You added "ULTRA" to your name and still lost.', 'Next time I\'m adding "MEGA". Watch.'],
      ],
    },
  },
  {
    title: 'CHAPTER 2', subtitle: 'THE SELFIE SQUAD', bosses: ['hat', 'shook'], music: 'selfie',
    levels: [
      {
        name: 'SAY CHEESE', stage: 'street', enemies: ['hat'], bystander: 'shook', hp: 100, aggression: 0.45, block: 0.25, dmg: 0.95,
        mods: { selfie: true },
        intro: [
          ['n', 'Biton is defeated. But he made a phone call...'],
          ['shook', 'WAIT. Is that the guy who beat BITON?!'],
          ['hat', 'Relax. I\'ll handle this. You film.'],
          ['shook', 'SELFIE FIRST!!'],
          ['n', 'TIP: When he yells SELFIE, block to cover your eyes... or TAUNT (T) to strike a pose.'],
        ],
        defeat: 'At least the hat survived.',
        gloat: 'Hat: 1. You: 0.',
      },
      {
        name: 'IT WAS HIM', stage: 'street', enemies: ['hat', 'shook'], hp: 85, aggression: 0.5, block: 0.25, dmg: 0.95,
        mods: { tag: true, point: true, selfie: true },
        intro: [
          ['hat', 'Okay, that was embarrassing.'],
          ['shook', 'That was YOUR fault!'],
          ['hat', 'It was HIM.'],
          ['shook', 'We take turns. You can\'t beat both of us!'],
          ['n', 'TIP: The one waiting outside slowly heals. Don\'t let them rest.'],
        ],
        defeat: 'IT WAS HIS FAULT!',
        gloat: 'Teamwork makes the dream work!',
      },
      {
        name: 'GROUP SELFIE', stage: 'street', variant: 'party', enemies: ['hat', 'shook'], hp: 75, aggression: 0.5, block: 0.25, dmg: 0.95,
        mods: { duo: true, point: true, groupSelfie: true },
        intro: [
          ['shook', 'New plan. BOTH of us. At the SAME TIME.'],
          ['p', 'That\'s literally cheating.'],
          ['hat', 'It\'s called teamwork. Look it up.'],
          ['shook', 'GROUP SELFIEEEE!'],
          ['n', 'TIP: Hit them while they pose... but BLOCK when the countdown hits 1.'],
        ],
        defeat: 'Delete that picture. DELETE IT.',
        gloat: '#SQUADGOALS',
      },
    ],
    roast: {
      options: [
        ['Nice hat. Does it come with a personality?', 'It comes with SHADE. Literally.'],
        ['Shook, your face has been on "surprised" since 2019.', 'WHAT?! ...Okay, yeah. Fair.'],
        ['Pointing at each other is the only teamwork you have.', 'IT WAS HIM. / NO, IT WAS HIM.'],
      ],
    },
  },
  {
    title: 'CHAPTER 3', subtitle: 'THE SILAN SOMMELIER', bosses: ['silan'], music: 'silan',
    levels: [
      {
        name: 'A TASTE OF SILAN', stage: 'kitchen', enemies: ['silan'], hp: 110, aggression: 0.45, block: 0.25, dmg: 1,
        mods: { jars: true, offer: true },
        intro: [
          ['n', 'You walk into a kitchen. It smells like dates.'],
          ['silan', 'You look tired. Have you tried silan?'],
          ['p', 'I came here to fight.'],
          ['silan', 'Silan first. Then fight. 100% dates, bro.'],
          ['n', 'TIP: Don\'t let him feed you (block or hit him). Sticky puddles slow you down.'],
        ],
        defeat: 'You\'ll come back. Everyone comes back for the silan.',
        gloat: 'See? You needed the sugar.',
      },
      {
        name: 'SUGAR RUSH', stage: 'kitchen', enemies: ['silan'], hp: 120, aggression: 0.5, block: 0.28, dmg: 1,
        mods: { jars: true, eat: true, offer: true },
        intro: [
          ['silan', 'One spoon... two spoon... THREE SPOON...'],
          ['p', 'Are you okay?'],
          ['silan', 'I\'VE NEVER BEEN BETTER. I CAN HEAR COLORS.'],
          ['n', 'TIP: Each spoon makes him faster. Hit him while he eats, or wait for the sugar crash.'],
        ],
        defeat: 'Sugar... crash... forever...',
        gloat: 'SUGAR POWER! WOOOO!',
      },
      {
        name: 'THE INFOMERCIAL', stage: 'infomercial', enemies: ['silan'], hp: 140, aggression: 0.55, block: 0.3, dmg: 1.05,
        mods: { jars: true, jarRain: true, wave: true, infomercial: true }, music: 'infomercial',
        intro: [
          ['silan', 'Are YOU tired of NOT having silan?'],
          ['p', 'No.'],
          ['silan', 'Then call NOW! 1-800-SILAN!'],
          ['n', 'He spent his savings on this commercial. Jump the syrup waves. Watch the sky.'],
        ],
        defeat: 'Price slashed... to ZERO...',
        gloat: 'SOLD! To the person on the floor!',
      },
    ],
    roast: {
      options: [
        ['You don\'t have blood. You have silan with a pulse.', '...That\'s the nicest thing anyone has ever said to me.'],
        ['That jar has seen more of you than your family.', 'It\'s not a jar. It\'s a lifestyle.'],
        ['You\'re so sweet, dentists keep your photo on the wall.', 'Thank you. Dentists are my biggest fans.'],
      ],
    },
  },
  {
    title: 'CHAPTER 4', subtitle: 'THE HYDRATION MONK', bosses: ['monk'], music: 'elevator',
    levels: [
      {
        name: 'GOING UP', stage: 'elevator', enemies: ['monk'], hp: 120, aggression: 0.5, block: 0.3, dmg: 1,
        mods: { elevator: true, drink: true },
        intro: [
          ['n', 'The elevator doors close. Someone is already inside.'],
          ['monk', '...'],
          ['p', 'Uh... hi?'],
          ['monk', 'Have you had water today.'],
          ['p', 'That didn\'t even sound like a question.'],
          ['monk', 'It was not a question.'],
          ['n', 'TIP: Hit him while he drinks to knock the bottle away.'],
        ],
        defeat: 'I need. A drink.',
        gloat: 'You lost because you are dehydrated.',
      },
      {
        name: 'THE HYDRATION LECTURE', stage: 'elevator', enemies: ['monk'], hp: 130, aggression: 0.55, block: 0.3, dmg: 1,
        mods: { elevator: true, lecture: true, splash: true, drink: true },
        intro: [
          ['monk', 'You are sixty percent water.'],
          ['monk', 'I am seventy five percent water.'],
          ['monk', 'I am better than you. By fifteen percent.'],
          ['n', 'TIP: Jump over his lecture. Wet floors are slippery.'],
        ],
        defeat: 'Class... dismissed.',
        gloat: 'Lesson complete. Drink some water.',
      },
      {
        name: 'BOTTLE ASCENSION', stage: 'elevator', variant: 'dark', enemies: ['monk'], hp: 150, aggression: 0.6, block: 0.32, dmg: 1.05,
        mods: { elevator: true, laser: true, splash: true, lightsOut: true, ascend: true }, music: 'ascension',
        intro: [
          ['n', 'The elevator stops between floors. The lights flicker.'],
          ['monk', 'The bottle has chosen me.'],
          ['p', 'It\'s a water bottle.'],
          ['monk', 'It is THE water bottle.'],
          ['n', 'FINAL BOSS. Block the lasers, or jump the low ones.'],
        ],
        defeat: '...thirsty.',
        gloat: 'The bottle wins. The bottle always wins.',
      },
    ],
    roast: {
      options: [
        ['You hold that bottle more carefully than any relationship.', 'The bottle never leaves me on read.'],
        ['Blink twice if the bottle is holding YOU hostage.', '... ... ...It is fine.'],
        ['You have the same face in every photo. Including this fight.', 'This is my happy face.'],
      ],
    },
  },
];

const CREDITS = [
  'BITON: THE RECKONING',
  '',
  'STARRING',
  'BITON - still says he was lagging.',
  'SIR HAT-A-LOT - has infinite hats. Nobody knows where they come from.',
  'MR. SHOOK - has not blinked since the group selfie.',
  'THE SILAN SOMMELIER - currently offering silan to the credits.',
  'THE HYDRATION MONK - drank 4 liters during this game. Face unchanged.',
  'YOU - undisputed champion of the friend group. For now.',
  '',
  'Biton has requested a rematch.',
  'Request denied.',
  '',
  'THE END',
];

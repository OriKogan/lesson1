/* =====================================================================
   BITON: THE RECKONING — config.js
   ---------------------------------------------------------------------
   All names, jokes, dialogue and level settings live here, so you can
   change them without touching the game engine.

   - Rename anyone: change `name` below.
   - Level numbers: hp = boss health, aggression 0..1, block 0..1,
     dmg = how hard the boss hits (1 = normal).
   - mods switch gimmicks on for a round. Universal ones (work for any
     boss): ultra, phone, flop, rageQuit. The rest belong to one boss.
   ===================================================================== */

const PLAYER = {
  name: 'BITON',
  face: 'assets/faces/biton.png',
  look: { skin: '#daa682', hair: '#191614', hairStyle: 'messy', shirt: '#f7f5ef', pants: '#1d2028', shoes: '#eeeeee' },
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
  nitzan: {
    name: 'NITZAN',
    face: 'assets/faces/nitzan.png',
    look: { skin: '#f0c4a4', shirt: '#151515', shirtMark: 'eye', pants: '#1c1c1c', shoes: '#eeeeee', bracelet: true },
    taunts: ['Respect the hat.', 'Hat game: strong. Your game: weak.', 'You just got hat-tricked.', 'Smile for the camera!', 'This one comes back. Like me.'],
    hurtLines: ['NOT THE HAT!', 'My glasses!', 'Rude.', 'Okay, that landed.'],
    tiltLines: ['Did you just disrespect THE HAT?', 'The hat is angry now.', 'Alright. Focus time.'],
  },
  ori: {
    name: 'ORI',
    face: 'assets/faces/ori.png',
    look: { skin: '#d9a98a', shirt: '#d8cfbf', shirtMark: 'knit', pants: '#2a2a2a', shoes: '#ffffff', backpack: true, watch: true },
    taunts: ['WHAAAT?!', 'DID YOU SEE THAT?!', 'BRO NO WAY!', 'I\'M SHOOK!', 'I\'m just warming up!'],
    hurtLines: ['WHAT?!', 'HOW?!', 'NO WAY!', 'Okay!'],
    tiltLines: ['I\'M EXTRA SHOOK NOW!', 'WHAT DID YOU JUST SAY?!', 'Alright, I saw that.'],
  },
  tom: {
    name: 'TOM',
    face: 'assets/faces/tom.png',
    look: { skin: '#e8b090', shirt: '#141414', shirtMark: 'ship', pants: '#30333a', shoes: '#ffffff' },
    taunts: ['Have you tried it though?', '100% dates!', 'It\'s basically a vegetable.', 'Sweet, like victory.', 'Quick snack break?'],
    hurtLines: ['Careful! The jar!', 'Not the syrup!', 'Sticky situation!'],
    tiltLines: ['You insulted the syrup. You insulted ME.', 'No syrup for you. EVER.', 'The spoon is down.'],
  },
  ilay: {
    name: 'ILAY',
    face: 'assets/faces/ilay.png',
    look: { skin: '#d4a07e', shirt: '#f2f1ec', shirtMark: 'chain', pants: '#121212', shoes: '#1b1b1b' },
    // Ilay speaks his lines out loud in a flat robot voice. Set voice: null to turn that off.
    voice: { pitch: 0.2, rate: 0.75 },
    taunts: ['Hydrate.', 'I am calm.', 'Water is patient.', 'You are thirsty. I can tell.', 'Sip.'],
    hurtLines: ['Okay.', 'That was a hit.', 'I felt that. Slightly.'],
    tiltLines: ['I am... mildly annoyed.', 'My expression has not changed. But inside, I am furious.'],
  },
};

/* Lines retained for the optional excuse projectile effect. */
const EXCUSES = ['LAG!', 'MY HAND SLIPPED', 'WASN\'T READY', 'DOESN\'T COUNT', 'SUN IN MY EYES', 'BROKEN CONTROLLER', 'MY MOM CALLED', 'I WAS AFK'];

const HIT_WORDS = ['POW!', 'BONK!', 'WHAM!', 'SMACK!', 'BOP!', 'OOF!', 'THWACK!', 'BAM!', 'YEET!', 'KAPOW!'];

/* Combo counter titles (hits in a row without getting hit). */
const COMBO_TITLES = [[2, 'NICE'], [3, 'RUDE'], [5, 'UNCALLED FOR'], [7, 'DISRESPECTFUL'], [9, 'CALL HIS MOM'], [12, 'FRIENDSHIP OVER'], [15, 'PLEASE STOP'], [20, 'HE HAS A FAMILY']];

const OFFER_LINES = ['You HAVE to try this.', 'Just one spoon. ONE.', '100% dates, bro!', 'It\'s healthy, I swear.', 'Open wide!'];
const INFOMERCIAL_LINES = ['But wait, there\'s MORE!', 'Call NOW!', 'Tired of NOT having syrup?', 'Order two, get a third jar FREE!', 'Doctors HATE this jar!', 'Operators are standing by!'];
const LECTURE_LINES = ['You should be drinking right now.', 'Have you had eight cups today.', 'Water is life. You are not.', 'Hydration is a lifestyle.', 'Thirst is a choice.'];
const LECTURE_WORDS = ['DRINK', 'WATER', '8 CUPS', 'DAILY', 'SIP', 'H2O', 'THIRST'];
const FLOOR_NAMES = ['FLOOR 2: PARKING (NO PARKING)', 'FLOOR 4: HR. THEY KNOW.', 'FLOOR 6: THE GYM NOBODY USES', 'FLOOR 8: TOM\'S SYRUP STORAGE', 'FLOOR 11: BITON\'S EXCUSE DEPT.', 'FLOOR 13: DOES NOT EXIST', 'FLOOR 21: NITZAN\'S HAT WAREHOUSE', 'FLOOR 99: HYDRATION HEAVEN'];

const TITLE_JOKES = ['Four friends. Twelve rounds. One Biton.', 'You are Biton. Make it count.', 'Nitzan. Ori. Tom. Ilay. In that order.', 'Hydrate before playing. Ilay insists.', 'Tom brought syrup. Lots of it.', 'No hats were harmed. Okay, a few.', 'Round 3 is where friendships end.'];

const LOSE_TIPS = [
  'TIP: Try hitting him.',
  'TIP: Blocking exists. Hold S.',
  'TIP: Taunting (T) fills your slipper meter. Disrespect is a resource.',
  'TIP: Full meter + L = call his mom.',
  'TIP: The yellow bar is YOUR health. Keep it yellow.',
  '{boss} is posting this in the group chat right now.',
  'TIP: Kicks hit people lying on the floor. Just saying.',
  'TIP: Watch the windup. Block first, then hit back.',
  'Take a breath. You have got this, Biton.',
];

const RANKS = [
  [0.85, 'S', 'FLAWLESS DISRESPECT'],
  [0.65, 'A', 'CLEAN. VERY CLEAN.'],
  [0.45, 'B', 'NOT BAD AT ALL'],
  [0.25, 'C', 'A LITTLE SWEATY'],
  [0, 'D', 'HE WILL SAY HE WAS LAGGING'],
];

/* ---------------------------------------------------------------------
   CHAPTERS & LEVELS: one chapter per friend, three rounds each.
   who in dialogue: 'n' = narrator, 'p' = player, or a character key.
   --------------------------------------------------------------------- */
const CHAPTERS = [
  {
    title: 'CHAPTER 1', subtitle: 'NITZAN', bosses: ['nitzan'], music: 'selfie',
    levels: [
      {
        name: 'THE RETURN SHOT', stage: 'street', enemies: ['nitzan'], hp: 85, aggression: 0.34, block: 0.14, dmg: 0.7,
        mods: { tutorial: true },
        intro: [
          ['n', 'You are Biton. Four friends. Three rounds each. No excuses.'],
          ['nitzan', 'Biton! Ready for a round?'],
          ['p', 'Does the hat have its own health bar?'],
          ['nitzan', 'The hat has its own LAWYER.'],
          ['n', 'TIP: His thrown hat comes back. Jump over it, and move in while he recovers.'],
        ],
        defeat: 'At least the hat survived.',
        gloat: 'Hat: 1. Biton: 0.',
      },
      {
        name: 'SAY CHEESE', stage: 'street', enemies: ['nitzan'], bystander: 'ori', hp: 110, aggression: 0.46, block: 0.22, dmg: 0.9,
        mods: { selfie: true, phone: true },
        intro: [
          ['ori', 'WAIT. Round two? I\'m FILMING this.'],
          ['nitzan', 'Film my good side. Which is all of them.'],
          ['p', 'Can we fight without a camera crew?'],
          ['ori', 'SELFIE FIRST!!'],
          ['n', 'TIP: When Ori yells SELFIE, block to cover your eyes... or TAUNT (T) to strike a pose.'],
        ],
        defeat: 'Delete that picture. DELETE IT.',
        gloat: 'Caught in 4K, Biton.',
      },
      {
        name: 'ULTRA NITZAN', stage: 'street', enemies: ['nitzan'], hp: 145, aggression: 0.58, block: 0.3, dmg: 1.05,
        mods: { ultra: true, flop: true, rageQuit: true }, music: 'ultra',
        intro: [
          ['n', 'Nitzan has been training. (He watched one video.)'],
          ['nitzan', 'I have transcended. I am... ULTRA NITZAN.'],
          ['p', 'Did you just put "ultra" in front of your name?'],
          ['nitzan', 'AND I GOT A NEW HAT. FEAR ME.'],
          ['n', 'TIP: If he falls down screaming, he\'s faking. Kick him. If he runs away, chase him.'],
        ],
        defeat: 'Okay... maybe the hat was lagging.',
        gloat: 'ULTRA NITZAN IS UNSTOPPABLE!',
      },
    ],
    roast: {
      options: [
        ['Nice hat. Does it come with a personality?', 'It comes with SHADE. Literally.'],
        ['You added "ULTRA" to your name and still lost.', 'Next time I\'m adding "MEGA". Watch.'],
        ['Your hat came back quicker than your comeback.', 'It knows its way home.'],
      ],
    },
  },
  {
    title: 'CHAPTER 2', subtitle: 'ORI', bosses: ['ori'], music: 'selfie',
    levels: [
      {
        name: 'TURN IT UP', stage: 'street', enemies: ['ori'], hp: 95, aggression: 0.38, block: 0.16, dmg: 0.75,
        mods: { point: true },
        intro: [
          ['ori', 'Biton! MY turn. Are you SHOOK?'],
          ['p', 'You\'ve had that face since 2019.'],
          ['ori', 'THIS IS MY NORMAL FACE!'],
          ['n', 'TIP: Back away or block when he winds up a shout. Block the pointing finger, then counter.'],
        ],
        defeat: 'WHAAAT?! ...okay, fair.',
        gloat: 'DID YOU SEE THAT?! I SAW THAT!',
      },
      {
        name: 'IT WAS HIM', stage: 'street', enemies: ['ori', 'nitzan'], hp: 85, aggression: 0.46, block: 0.22, dmg: 0.9,
        mods: { tag: true, point: true, selfie: true },
        intro: [
          ['ori', 'Okay, that was embarrassing. I brought backup.'],
          ['nitzan', 'I\'m only here because he said there\'d be snacks.'],
          ['ori', 'It was HIM who lost last time.'],
          ['nitzan', 'It was HIM.'],
          ['n', 'TIP: They tag in and out. The one waiting outside slowly heals, so don\'t let them rest.'],
        ],
        defeat: 'IT WAS HIS FAULT!',
        gloat: 'Teamwork makes the dream work!',
      },
      {
        name: 'GROUP SELFIE', stage: 'street', variant: 'party', enemies: ['ori', 'nitzan'], hp: 90, aggression: 0.52, block: 0.26, dmg: 1.0,
        mods: { duo: true, point: true, groupSelfie: true, ultra: true }, music: 'ultra',
        intro: [
          ['ori', 'New plan. BOTH of us. At the SAME TIME. And I\'m ULTRA now.'],
          ['p', 'That\'s literally cheating.'],
          ['nitzan', 'It\'s called teamwork. Look it up.'],
          ['ori', 'GROUP SELFIEEEE!'],
          ['n', 'TIP: Hit them while they pose... but BLOCK (or taunt) when the countdown hits 1.'],
        ],
        defeat: 'This is going in the group chat. The LOSS, not the photo.',
        gloat: '#SQUADGOALS',
      },
    ],
    roast: {
      options: [
        ['Ori, your face has been on "surprised" since 2019.', 'WHAT?! ...Okay, yeah. Fair.'],
        ['Pointing at Nitzan is the only teamwork you have.', 'IT WAS HIM. / NO, IT WAS HIM.'],
        ['I could hear that scream from the next street.', 'Then the sound is working.'],
      ],
    },
  },
  {
    title: 'CHAPTER 3', subtitle: 'TOM', bosses: ['tom'], music: 'tom',
    levels: [
      {
        name: 'JUST ONE SPOON', stage: 'kitchen', enemies: ['tom'], hp: 100, aggression: 0.42, block: 0.18, dmg: 0.8,
        mods: { jars: true, offer: true },
        intro: [
          ['n', 'You walk into a kitchen. It smells like dates.'],
          ['tom', 'You look tired. Have you tried date syrup?'],
          ['p', 'I came here to fight.'],
          ['tom', 'Syrup first. Then fight. 100% dates, bro.'],
          ['n', 'TIP: Don\'t let him feed you (block or hit him). Sticky puddles slow you down.'],
        ],
        defeat: 'You\'ll come back. Everyone comes back for the syrup.',
        gloat: 'See? You needed the sugar.',
      },
      {
        name: 'SUGAR RUSH', stage: 'kitchen', enemies: ['tom'], hp: 125, aggression: 0.5, block: 0.24, dmg: 0.95,
        mods: { jars: true, eat: true, offer: true },
        intro: [
          ['tom', 'One spoon... two spoon... THREE SPOON...'],
          ['p', 'Are you okay?'],
          ['tom', 'I\'VE NEVER BEEN BETTER. I CAN HEAR COLORS.'],
          ['n', 'TIP: Each spoon makes him faster. Hit him while he eats, or wait for the sugar crash.'],
        ],
        defeat: 'Sugar... crash... forever...',
        gloat: 'SUGAR POWER! WOOOO!',
      },
      {
        name: 'THE INFOMERCIAL', stage: 'infomercial', enemies: ['tom'], hp: 160, aggression: 0.58, block: 0.3, dmg: 1.05,
        mods: { jars: true, jarRain: true, wave: true, infomercial: true, ultra: true }, music: 'infomercial',
        intro: [
          ['tom', 'Are YOU tired of NOT having syrup?'],
          ['p', 'No.'],
          ['tom', 'Then call NOW! 1-800-SYRUP! Also I am ULTRA now. It\'s the sugar.'],
          ['n', 'He spent his savings on this commercial. Jump the syrup waves. Watch the sky.'],
        ],
        defeat: 'Price slashed... to ZERO...',
        gloat: 'SOLD! To the person on the floor!',
      },
    ],
    roast: {
      options: [
        ['You don\'t have blood. You have syrup with a pulse.', '...That\'s the nicest thing anyone has ever said to me.'],
        ['That jar has seen more of you than your family.', 'It\'s not a jar. It\'s a lifestyle.'],
        ['You\'re so sweet, dentists keep your photo on the wall.', 'Thank you. Dentists are my biggest fans.'],
      ],
    },
  },
  {
    title: 'CHAPTER 4', subtitle: 'ILAY', bosses: ['ilay'], music: 'elevator',
    levels: [
      {
        name: 'GOING UP', stage: 'elevator', enemies: ['ilay'], hp: 115, aggression: 0.46, block: 0.22, dmg: 0.85,
        mods: { elevator: true, drink: true },
        intro: [
          ['n', 'The elevator doors close. Someone is already inside.'],
          ['ilay', '...'],
          ['p', 'Uh... hi?'],
          ['ilay', 'Have you had water today.'],
          ['p', 'That didn\'t even sound like a question.'],
          ['ilay', 'It was not a question.'],
          ['n', 'TIP: Hit him while he drinks to knock the bottle away.'],
        ],
        defeat: 'I need. A drink.',
        gloat: 'You lost because you are dehydrated.',
      },
      {
        name: 'THE HYDRATION LECTURE', stage: 'elevator', enemies: ['ilay'], hp: 140, aggression: 0.54, block: 0.28, dmg: 1.0,
        mods: { elevator: true, lecture: true, splash: true, drink: true },
        intro: [
          ['ilay', 'You are sixty percent water.'],
          ['ilay', 'I am seventy five percent water.'],
          ['ilay', 'I am better than you. By fifteen percent.'],
          ['n', 'TIP: Jump over his lecture. Wet floors are slippery.'],
        ],
        defeat: 'Class... dismissed.',
        gloat: 'Lesson complete. Drink some water.',
      },
      {
        name: 'BOTTLE ASCENSION', stage: 'elevator', variant: 'dark', enemies: ['ilay'], hp: 180, aggression: 0.62, block: 0.34, dmg: 1.15,
        mods: { elevator: true, laser: true, splash: true, lightsOut: true, ascend: true, ultra: true, rageQuit: true }, music: 'ascension',
        intro: [
          ['n', 'The elevator stops between floors. The lights flicker.'],
          ['ilay', 'The bottle has chosen me.'],
          ['p', 'It\'s a water bottle.'],
          ['ilay', 'It is THE water bottle.'],
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
  'FOUR FRIENDS. TWELVE ROUNDS.',
  '',
  'BITON (YOU) - undisputed champion of the friend group. For now.',
  'NITZAN - has infinite hats. Nobody knows where they come from.',
  'ORI - has not blinked since the group selfie.',
  'TOM - currently offering syrup to the credits.',
  'ILAY - drank 4 liters during this game. Face unchanged.',
  '',
  'Everyone has requested a rematch.',
  'Requests denied.',
  '',
  'THE END',
];

/**
 * Localization (i18n) Engine
 * Full English & Persian (Farsi) support with instant runtime switching.
 */

export type Language = 'en' | 'fa';

export interface Translations {
  title: string;
  subtitle: string;
  description: string;
  startCta: string;
  controlHint: string;
  brand: string;
  scenes: {
    desert: string;
    duel: string;
    alien: string;
    mabel: string;
  };
  actions: {
    hatTip: string;
    duelStance: string;
    shoot: string;
    jump: string;
    horse: string;
    rear: string;
  };
  duel: {
    streak: string;
    bestReaction: string;
    ready: string;
    fire: string;
    foul: string;
    tooSlow: string;
    won: (ms: number) => string;
    drawTime: (ms: number) => string;
  };
  inspector: {
    title: string;
    lineBoil: string;
    debugSkeleton: string;
    active: string;
    inactive: string;
    engineInfo: string;
    language: string;
  };
  help: {
    title: string;
    move: string;
    moveDesc: string;
    run: string;
    runDesc: string;
    jump: string;
    jumpDesc: string;
    horse: string;
    horseDesc: string;
    hatTip: string;
    hatTipDesc: string;
    duel: string;
    duelDesc: string;
    shoot: string;
    shootDesc: string;
    scenes: string;
    scenesDesc: string;
    sound: string;
    soundDesc: string;
    lang: string;
    langDesc: string;
    close: string;
  };
  pause: {
    title: string;
    quote: string;
    resume: string;
    toggleSound: string;
    mute: string;
    unmute: string;
  };
  quotes: string[];
}

export const translations: Record<Language, Translations> = {
  en: {
    title: 'El Bueno de Cuttlas',
    subtitle: 'Tribute to the graphic universe of Calpurnio',
    description:
      'Procedural 2D skeletal animation engine with inverse kinematics (IK/FK), spring physics hat, hand-drawn line boil ink jitter, and Wild West duels.',
    startCta: 'ENTER THE DESERT [SPACE / ENTER]',
    controlHint:
      'A/D Walk · Shift Run · R Mount Horse · W/Space Jump · H Hat Tip · Q Standoff/Rear · Click/J Shoot · 1-4 Scenes · L Lang',
    brand: 'CUTTLAS',
    scenes: {
      desert: '1. Desert',
      duel: '2. High Noon Duel',
      alien: '3. Alien 37',
      mabel: '4. Mabel',
    },
    actions: {
      hatTip: '[H] Hat Tip',
      duelStance: '[Q] Standoff',
      shoot: '[Click/J] Shoot',
      jump: '[W/Space] Jump',
      horse: '[R] Ride Horse',
      rear: '[Q] Horse Neigh',
    },
    duel: {
      streak: 'STREAK',
      bestReaction: 'BEST REACTION',
      ready: 'GET READY!...',
      fire: '¡¡¡ FIRE !!!',
      foul: 'FOUL! YOU SHOT TOO EARLY',
      tooSlow: 'TOO SLOW! THE OUTLAW SHOT FIRST',
      won: (ms: number) => `PERFECT SHOT! (${ms} ms)`,
      drawTime: (ms: number) => `Quick-draw time: ${ms} ms`,
    },
    inspector: {
      title: 'Calpurnio Engine',
      lineBoil: 'Ink Boil Jitter:',
      debugSkeleton: 'Skeleton / Rig Inspector:',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
      engineInfo:
        'Line boil: ~10 FPS · Sim: 60 FPS · Inverse Kinematics: 2-bone analytical forward-knee rig with ground-locking.',
      language: 'Language:',
    },
    help: {
      title: 'Instructions & Controls',
      move: 'A / D or Left / Right:',
      moveDesc: 'Walk with jaunty stride (or gallop on horse)',
      run: 'Shift + A / D:',
      runDesc: 'Run / Fast Gallop',
      jump: 'W or Space:',
      jumpDesc: 'Jump (or rear up when stopped on horse)',
      horse: 'R:',
      horseDesc: 'Mount / Dismount horse with gallop & rearing',
      hatTip: 'H:',
      hatTipDesc: 'Existential Hat Salute (IK arm lift)',
      duel: 'Q:',
      duelDesc: 'Western quick-draw standoff / Horse neigh',
      shoot: 'Mouse Click / J:',
      shootDesc: 'Draw and fire revolver with recoil',
      scenes: '1, 2, 3, 4:',
      scenesDesc: 'Switch scenes (Desert, Duel, Alien 37, Mabel)',
      sound: 'M:',
      soundDesc: 'Toggle procedural synthesizer audio',
      lang: 'L:',
      langDesc: 'Toggle English / Persian (فارسی)',
      close: 'GOT IT, PARTNER',
    },
    pause: {
      title: 'GAME PAUSED',
      quote: 'Time stands still in the desert, but the infinite remains out there.',
      resume: 'RESUME [ESC]',
      toggleSound: 'MUTE / UNMUTE AUDIO',
      mute: 'MUTE AUDIO',
      unmute: 'ENABLE AUDIO',
    },
    quotes: [
      'The universe is infinite, but this hat fits me like a glove.',
      'Shoot first, philosophize later... or perhaps neither.',
      'The desert has no beginning or end, just like a good moral dilemma.',
      'Mabel says I think too much. Perhaps the concept of thought is relative.',
      '37 says in his galaxy they do not use money or rush. Such primitive folk.',
      'Sometimes I wonder if I truly exist or if I am merely ink upon paper.',
      'The horizon is always at the exact same distance. How impolite.',
      'The speed of lead is finite; human stupidity, on the other hand, is not.',
      'If a tree falls in the desert and no one hears it... was it truly a cactus?',
      'A good revolver does not need an instruction manual.',
    ],
  },
  fa: {
    title: 'ال بوئنو د کوتلاس',
    subtitle: 'ادای احترام به شاهکار و جهان گرافیکی کالپورنیو',
    description:
      'موتور انیمیشن دوبعدی پروسه‌محور با سینماتیک معکوس (IK/FK)، فیزیک کلاه فنری، لرزش جوهر دستی (Line Boil) و دوئل‌های وسترن در کویر بی‌پایان.',
    startCta: 'ورود به کویر [اسپیس / اینتر]',
    controlHint:
      'A/D: گام · Shift: دویدن · R: سوارکاری با اسب · W/اسپیس: پرش و شیهه · H: احترام کلاه · Q: دوئل · کلیک/J: شلیک · ۱-۴: صحنه‌ها · L: زبان',
    brand: 'کوتلاس',
    scenes: {
      desert: '۱. کویر',
      duel: '۲. دوئل در آفتاب',
      alien: '۳. بیگانه ۳۷',
      mabel: '۴. مابل',
    },
    actions: {
      hatTip: '[H] احترام کلاه',
      duelStance: '[Q] حالت دوئل',
      shoot: '[کلیک / J] شلیک',
      jump: '[W/اسپیس] پرش',
      horse: '[R] سوارکاری',
      rear: '[Q] شِیهه اسب',
    },
    duel: {
      streak: 'زنجیره برد',
      bestReaction: 'بهترین رکورد',
      ready: 'آماده‌باش!...',
      fire: '¡¡¡ شلیک کن !!!',
      foul: 'خطا! زودتر از موعد شلیک کردی',
      tooSlow: 'خیلی کند بودی! خلافکار زودتر شلیک کرد',
      won: (ms: number) => `شلیک بی‌نقص! (${ms} میلی‌ثانیه)`,
      drawTime: (ms: number) => `سرعت کشیدن سلاح: ${ms} میلی‌ثانیه`,
    },
    inspector: {
      title: 'تنظیمات موتور کالپورنیو',
      lineBoil: 'شدت لرزش قلم (Line Boil):',
      debugSkeleton: 'نمایش مفاصل و ریگ استخوان:',
      active: 'فعال',
      inactive: 'غیرفعال',
      engineInfo:
        'نرخ لرزش قلم: حدود ۱۰ فریم بر ثانیه · شبیه‌سازی: ۶۰ فریم بر ثانیه · سینماتیک معکوس زانوی مستقیم روبه‌جلو با تثبیت روی زمین.',
      language: 'تغییر زبان:',
    },
    help: {
      title: 'راهنما و کلیدهای کنترل',
      move: 'A / D یا کلیدهای جهت‌نما:',
      moveDesc: 'راه رفتن (یا تاختن چهارنعل روی اسب)',
      run: 'Shift + A / D:',
      runDesc: 'دویدن پرسرعت / تاخت تند اسب',
      jump: 'W یا اسپیس:',
      jumpDesc: 'پرش (یا شیهه و ایستادن روی دو پا در حالت سکون)',
      horse: 'R:',
      horseDesc: 'سوار شدن / پیاده شدن از اسب با شیهه و چهارنعل',
      hatTip: 'H:',
      hatTipDesc: 'سلام و احترام فلسفی با کلاه (IK دست)',
      duel: 'Q:',
      duelDesc: 'حالت آماده‌باش دوئل / شیهه کشیدن اسب',
      shoot: 'کلیک چپ یا J:',
      shootDesc: 'شلیک با شش‌لول همراه با لگد اسلحه',
      scenes: 'کلیدهای ۱ تا ۴:',
      scenesDesc: 'جابه‌جایی بین فصل‌ها (کویر، دوئل، بیگانه ۳۷، مابل)',
      sound: 'M:',
      soundDesc: 'قطع / وصل صدای سنتز صوتی',
      lang: 'L:',
      langDesc: 'تغییر زبان میان فارسی و انگلیسی',
      close: 'متوجه شدم، رفیق',
    },
    pause: {
      title: 'بازی متوقف شد',
      quote: 'زمان در کویر می‌ایستد، اما ابدیت همچنان آن بیرون منتظر ماست.',
      resume: 'ادامه بازی [ESC]',
      toggleSound: 'تغییر وضعیت صدا',
      mute: 'قطع صدا',
      unmute: 'وصل صدا',
    },
    quotes: [
      'جهان لایتناهی است، اما این کلاه دقیقاً اندازه‌ی سر من دوخته شده.',
      'اول شلیک کن، بعداً فلسفه‌بافی... یا شاید هم هیچ‌کدام.',
      'کویر نه آغازی دارد و نه پایانی، درست مثل یک بحران اخلاقی عمیق.',
      'مابل می‌گوید زیادی فکر می‌کنم. شاید مفهوم اندیشیدن هم نسبی باشد.',
      'بیگانه ۳۷ می‌گوید در کهکشان آن‌ها پول و عجله وجود ندارد. عجب آدم‌های عقب‌افتاده‌ای.',
      'گاهی شک می‌کنم که واقعاً وجود دارم یا صرفاً ردی از جوهر روی کاغذ هستم.',
      'افق همیشه در فاصله‌ای ثابت می‌ماند. عجب بی‌احترامی آشکاری به تلاش انسان.',
      'سرعت گلوله محدود است؛ اما سرعت حماقت بشر متأسفانه نامحدود است.',
      'اگر درختی در کویر بیفتد و کسی صدای آن را نشنود... آیا واقعاً کاکتوس بوده است؟',
      'یک شش‌لول بااصالت نیازی به دفترچه راهنمای استفاده ندارد.',
    ],
  },
};

export type WorkshopEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  doorTime: string;
  schedule: string;
  timeNote: string;
  venue: string;
  price: string;
  capacity: string;
  description: string;
  takeHome: string;
  registrationUrl: string;
  accentColor?: string;
  coverImage?: string;
  publishStatus?: string;
  signupStatus?: string;
  signupOpen?: string;
  signupClose?: string;
  signupMethod?: string;
};

export type SiteConfig = {
  name: string;
  wordmark: string;
  nameZh: string;
  tagline: string;
  bio: string;
  instagram: string;
  instagramHandle: string;
  instagramDm: string;
  xUrl: string;
  xHandle: string;
  siteUrl: string;
  about: string;
  sheetId: string;
};

export type NewsItem = {
  date: string;
  title: string;
  body: string;
  link: string;
  image: string;
};

export type CoursePrice = {
  label: string;
  amount: string;
  each: string;
  note: string;
};

export type CourseOffering = {
  title: string;
  subtitle: string;
  body: string;
  prices: CoursePrice[];
  tags: string[];
  duration: string;
  takeHome: string;
  cta: string;
  href: string;
};

export type Offerings = {
  explore: CourseOffering;
  gathering: CourseOffering;
  choose: {
    title: string;
    paragraphs: string[];
  };
};

export type RecapPhoto = {
  src: string;
  alt: string;
};

export type Recap = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  photos: RecapPhoto[];
  body: string;
};

export type WorkshopEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  price: string;
  capacity: string;
  description: string;
  takeHome: string;
  registrationUrl: string;
  accentColor?: string;
};

export type SiteConfig = {
  name: string;
  wordmark: string;
  nameZh: string;
  tagline: string;
  bio: string;
  instagram: string;
  instagramHandle: string;
  lineUrl: string;
  lineId: string;
  xUrl: string;
  xHandle: string;
  siteUrl: string;
  about: string;
  eventsSheetUrl: string;
};

export type OfferingPoint = {
  title: string;
  body: string;
  tone: 'sage' | 'red' | 'aqua';
};

export type Offerings = {
  solo: {
    name: string;
    kind: string;
    pill: string;
  };
  gathering: {
    name: string;
    kind: string;
    pill: string;
    price: string;
    points: OfferingPoint[];
  };
};

export type ProductItem = {
  name: string;
  description: string;
  price: string;
  duration: string | null;
};

export type ProductGroup = {
  heading: string;
  items: ProductItem[];
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

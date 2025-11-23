export enum DayOfTheWeek {
  SUNDAY,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY
};

export enum FulfillmentType {
  PickUp = 'PickUp',
  DineIn = 'DineIn',
  Delivery = 'Delivery',
  Shipping = 'Shipping',
  ThirdParty = 'ThirdParty'
}

export enum DISPLAY_AS {
  OMIT = 'OMIT',
  YOUR_CHOICE_OF = 'YOUR_CHOICE_OF',
  LIST_CHOICES = 'LIST_CHOICES'
};

export enum MODIFIER_MATCH { NO_MATCH, AT_LEAST, EXACT_MATCH };

export enum PRODUCT_LOCATION { LEFT, RIGHT };

export enum PriceDisplay {
  'FROM_X' = 'FROM_X',
  'VARIES' = 'VARIES',
  'ALWAYS' = 'ALWAYS',
  'MIN_TO_MAX' = 'MIN_TO_MAX',
  'LIST' = 'LIST'
};

export enum ProductInstanceFunctionType {
  'ConstLiteral' = "ConstLiteral",
  'IfElse' = 'IfElse',
  'Logical' = 'Logical',
  'ModifierPlacement' = 'ModifierPlacement',
  'HasAnyOfModifierType' = 'HasAnyOfModifierType',
  'ProductMetadata' = 'ProductMetadata'
};

export enum OrderInstanceFunctionType {
  'ConstLiteral' = "ConstLiteral",
  'IfElse' = 'IfElse',
  'Logical' = 'Logical'
};

export enum MODIFIER_CLASS {
  SIZE = 'SIZE',
  ADD = 'ADD',
  SUB = 'SUB',
  REMOVAL = 'REMOVAL',
  NOTE = 'NOTE',
  PROMPT = 'PROMPT'
};
export enum CALL_LINE_DISPLAY {
  'SHORTCODE' = 'SHORTCODE',
  'SHORTNAME' = 'SHORTNAME',
  'QUANTITY' = 'QUANTITY'
};
export enum CURRENCY {
  USD = "USD"
};

export enum OptionPlacement {
  'NONE', 'LEFT', 'RIGHT', 'WHOLE'
};

export enum OptionQualifier {
  'REGULAR', 'LITE', 'HEAVY', 'OTS'
};

export enum ConstLiteralDiscriminator {
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  STRING = "STRING",
  MODIFIER_PLACEMENT = "MODIFIER_PLACEMENT",
  MODIFIER_QUALIFIER = "MODIFIER_QUALIFIER"
};

export enum MetadataField { 'FLAVOR', 'WEIGHT' };

export enum LogicalFunctionOperator {
  'AND' = "AND",
  'OR' = "OR",
  'NOT' = "NOT",
  'EQ' = "EQ",
  'NE' = "NE",
  'GT' = "GT",
  'GE' = "GE",
  'LT' = "LT",
  'LE' = "LE"
};

export enum DISABLE_REASON {
  ENABLED = 0,
  DISABLED_BLANKET,
  DISABLED_TIME,
  DISABLED_WEIGHT,
  DISABLED_FLAVORS,
  DISABLED_MAXIMUM,
  DISABLED_FUNCTION,
  DISABLED_NO_SPLITTING,
  DISABLED_SPLIT_DIFFERENTIAL,
  DISABLED_FULFILLMENT_TYPE,
  DISABLED_AVAILABILITY
};

export enum StoreCreditType {
  'MONEY' = 'MONEY',
  'DISCOUNT' = 'DISCOUNT'
};

export enum SeatingShape {
  RECTANGLE = "RECTANGLE",
  ELLIPSE = "ELLIPSE"
};

export enum WSeatingStatus {
  "PENDING" = "PENDING", // seating not yet confirmed
  "ASSIGNED" = "ASSIGNED", // seating has been assigned by a human
  "WAITING_ARRIVAL" = "WAITING_ARRIVAL", // waiting for guests to arrive
  "SEATED_WAITING" = "SEATED_WAITING", // some guests are seated, some guests still pending arrival
  "SEATED" = "SEATED", // all guests have arrived and are seated
  "WAITING_FOR_CHECK" = "WAITING_FOR_CHECK", // guests are waiting for the check
  "PAID" = "PAID", // guests have paid the check
  "COMPLETED" = "COMPLETED", // guests have left the table
};

export enum WFulfillmentStatus {
  'PROPOSED' = 'PROPOSED', // initial state of a new fulfillment
  'SENT' = 'SENT', // fulfillment has been sent to the fulfiller, this could be a KDS or a printer
  'CONFIRMED' = 'CONFIRMED', // confirmed by fulfiller
  'PROCESSING' = 'PROCESSING', // fulfillment has been started
  'COMPLETED' = 'COMPLETED', // fulfillment has been completed
  'CANCELED' = 'CANCELED' // fulfillment has been canceled
};

export enum WOrderStatus {
  'OPEN' = 'OPEN', // order submitted to WARIO, yet to be manually confirmed by staff
  'CONFIRMED' = 'CONFIRMED', // confirmed by staff, not yet charged
  'PROCESSING' = 'PROCESSING', // order has been started, is active
  'COMPLETED' = 'COMPLETED', // order has been completed, fulfilled, and charged
  'CANCELED' = 'CANCELED' // order has been canceled and refunded
};

export enum DiscountMethod {
  CreditCodeAmount = 'CreditCodeAmount',
  ManualPercentage = 'ManualPercentage',
  ManualAmount = 'ManualAmount'
};

export enum PaymentMethod {
  Cash = "Cash",
  CreditCard = "CreditCard",
  StoreCredit = "StoreCredit",
  //  External
}

export enum TenderBaseStatus {
  PROPOSED = 'PROPOSED',
  AUTHORIZED = 'AUTHORIZED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

// Note: Display logic might fallback to a different display option depending on live catalog data
export enum CategoryDisplay {
  // The child categories are displayed inline
  'FLAT' = 'FLAT',
  // The children categories are tabs just below the main category title
  'TAB' = 'TAB',
  // The children categories are displayed as expansion panels/accordions immediately below the main category title
  'ACCORDION' = 'ACCORDION',
  // either 0 child categories and many contained products OR no contained products to many child categories
  // child categories have no child categories
  // metadata fields used to populate columns
  // child categories are used as sortable/filterable columns in the table
  'TABLE' = 'TABLE'
};

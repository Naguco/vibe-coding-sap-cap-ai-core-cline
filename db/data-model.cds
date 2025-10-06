namespace bookstore;

using { managed, cuid } from '@sap/cds/common';

//
// Types and Enums
//

type OrderStatus : String enum {
  PENDING;
  CONFIRMED;
  SHIPPED;
  DELIVERED;
  CANCELLED;
}

type ReturnStatus : String enum {
  REQUESTED;
  APPROVED;
  REJECTED;
  PROCESSED;
}

type PaymentStatus : String enum {
  PENDING;
  COMPLETED;
  FAILED;
  REFUNDED;
}

type DiscountType : String enum {
  PERCENTAGE;
  FIXED_AMOUNT;
}

//
// Core Entities
//

entity Books : managed {
  key ID          : UUID;
  title           : String(200) not null;
  isbn            : String(20);
  description     : String(1000);
  price           : Decimal(10,2) not null;
  stock           : Integer not null default 0;
  imageUrl        : String(500);
  publishedDate   : Date;
  publisher       : String(100);
  language        : String(50) default 'English';
  pages           : Integer;
  
  // Associations
  author          : Association to Authors;
  categories      : Association to many BookCategories on categories.book = $self;
  orderItems      : Association to many OrderItems on orderItems.book = $self;
  reviews         : Association to many Reviews on reviews.book = $self;
}

entity Authors : managed {
  key ID          : UUID;
  name            : String(100) not null;
  biography       : String(2000);
  birthDate       : Date;
  nationality     : String(50);
  website         : String(200);
  
  // Associations
  books           : Association to many Books on books.author = $self;
}

entity Categories : managed {
  key ID          : UUID;
  name            : String(100) not null;
  description     : String(500);
  parentCategory  : Association to Categories;
  
  // Associations
  subcategories   : Association to many Categories on subcategories.parentCategory = $self;
  books           : Association to many BookCategories on books.category = $self;
}

//
// Junction Table for Many-to-Many relationship
//

entity BookCategories : cuid {
  book            : Association to Books;
  category        : Association to Categories;
}

//
// Transactional Entities
//

entity Orders : managed {
  key ID          : UUID;
  orderNumber     : String(20) not null;
  orderDate       : DateTime not null default $now;
  status          : OrderStatus not null default 'PENDING';
  paymentStatus   : PaymentStatus not null default 'PENDING';
  originalAmount  : Decimal(10,2) not null;
  discountAmount  : Decimal(10,2) default 0;
  totalAmount     : Decimal(10,2) not null;
  shippingAddress : String(500);
  billingAddress  : String(500);
  customerEmail   : String(100);
  customerPhone   : String(20);
  notes           : String(1000);
  
  // Discount association
  appliedDiscountCode : Association to DiscountCodes;
  
  // Associations
  items           : Composition of many OrderItems on items.order = $self;
  returns         : Association to many Returns on returns.order = $self;
}

entity OrderItems : cuid, managed {
  order           : Association to Orders;
  book            : Association to Books;
  quantity        : Integer not null;
  unitPrice       : Decimal(10,2) not null;
  totalPrice      : Decimal(10,2) not null;
}

entity Reviews : managed {
  key ID          : UUID;
  book            : Association to Books;
  rating          : Integer not null; // 1-5 stars
  title           : String(200);
  comment         : String(2000);
  isVerifiedPurchase : Boolean default false;
  helpfulVotes    : Integer default 0;
  
  // User context will be handled via $user (XSUAA)
  // No direct user association needed
}

entity Returns : managed {
  key ID          : UUID;
  returnNumber    : String(20) not null;
  order           : Association to Orders;
  book            : Association to Books;
  quantity        : Integer not null;
  reason          : String(500) not null;
  status          : ReturnStatus not null default 'REQUESTED';
  requestDate     : DateTime not null default $now;
  processedDate   : DateTime;
  refundAmount    : Decimal(10,2);
  notes           : String(1000);
  
  // User context will be handled via $user (XSUAA)
  // No direct user association needed
}

//
// Discount System Entities
//

entity DiscountCodes : managed {
  key ID            : UUID;
  code              : String(50) not null @assert.unique;
  description       : String(200);
  discountType      : DiscountType not null;
  discountValue     : Decimal(10,2) not null;
  minOrderAmount    : Decimal(10,2) default 0;
  maxDiscount       : Decimal(10,2);
  validFrom         : DateTime not null;
  validTo           : DateTime not null;
  isActive          : Boolean default true;
  usageLimit        : Integer; // null = unlimited usage
  usedCount         : Integer default 0;
  
  // Associations
  appliedOrders     : Association to many Orders on appliedOrders.appliedDiscountCode = $self;
}

//
// Views for Analytics and Reporting
//

view BooksWithStock as select from Books {
  *,
  case when stock > 10 then 'High'
       when stock > 0 then 'Low'
       else 'Out of Stock'
  end as stockStatus : String
} where stock >= 0;

view OrderSummary as select from Orders {
  ID,
  orderNumber,
  orderDate,
  status,
  totalAmount,
  count(items.ID) as itemCount : Integer
} group by ID, orderNumber, orderDate, status, totalAmount;

view PopularBooks as select from OrderItems {
  book.ID,
  book.title,
  book.author.name as authorName,
  sum(quantity) as totalSold : Integer,
  avg(book.reviews.rating) as averageRating : Decimal(3,2)
} group by book.ID, book.title, book.author.name;

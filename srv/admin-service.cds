using bookstore from '../db/data-model';
using API_BUSINESS_PARTNER.A_BusinessPartner as BusinessPartnerAPI from './external/API_BUSINESS_PARTNER';

service AdminService {

  // Full CRUD access to core entities - these are the primary redirection targets
  @cds.redirection.target
  @odata.draft.enabled
  entity Books                  as projection on bookstore.Books;

  @odata.draft.enabled
  entity Authors                as projection on bookstore.Authors;

  @odata.draft.enabled
  entity Categories             as projection on bookstore.Categories;

  // Full access to transactional entities - these are the primary redirection targets
  @cds.redirection.target
  entity Orders                 as projection on bookstore.Orders;

  @cds.redirection.target
  entity OrderItems             as projection on bookstore.OrderItems;

  entity Reviews                as projection on bookstore.Reviews;
  entity Returns                as projection on bookstore.Returns;

  // Junction table for many-to-many relationships
  entity BookCategories         as projection on bookstore.BookCategories;

  // Business Partner Integration - Book-Supplier relationship management
  // Note: BookSuppliers is managed through Books composition, so no draft enablement needed
  entity BookSuppliers          as projection on bookstore.BookSuppliers;

  // Discount management - primary redirection target
  @cds.redirection.target
  entity DiscountCodes          as projection on bookstore.DiscountCodes;

  // Admin-specific analytical views - read-only views, not redirection targets
  entity BooksWithStock         as projection on bookstore.BooksWithStock;
  entity OrderSummary           as projection on bookstore.OrderSummary;
  entity PopularBooks           as projection on bookstore.PopularBooks;

  @readonly
  entity S4HANA_BusinessPartner as
    select from BusinessPartnerAPI {
      BusinessPartner         as ID,
      BusinessPartnerName     as name,
      BusinessPartnerCategory as category,
      CreationDate            as createdAt,
      LastChangeDate          as modifiedAt
    };

  annotate S4HANA_BusinessPartner with @(cds.odata.valuelist);


  // Admin actions for discount management
  action activateDiscount(discountId: UUID)   returns String;
  action deactivateDiscount(discountId: UUID) returns String;
}

// Apply authorization to the entire service
annotate AdminService with @(requires: 'admin');

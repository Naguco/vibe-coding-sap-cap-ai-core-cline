using { API_BUSINESS_PARTNER as BP } from './API_BUSINESS_PARTNER';

// Supplier projection - filters Business Partners by category 'SUPPLIER'
entity Suppliers as projection on BP.A_BusinessPartner {
  key BusinessPartner as ID,
  BusinessPartnerFullName as name,
  BusinessPartnerCategory as category,
  CreationDate as createdAt,
  LastChangeDate as modifiedAt
} where BusinessPartnerCategory = '2'; // '2' is the standard code for SUPPLIER in S/4HANA

// Optional: Additional projections for future use
entity SupplierDetails as projection on BP.A_BusinessPartner {
  key BusinessPartner as ID,
  BusinessPartnerFullName as name,
  BusinessPartnerCategory as category,
  OrganizationBPName1 as organizationName,
  OrganizationBPName2 as organizationName2,
  SearchTerm1 as searchTerm,
  CreationDate as createdAt,
  LastChangeDate as modifiedAt,
  BusinessPartnerIsBlocked as isBlocked
} where BusinessPartnerCategory = '2';

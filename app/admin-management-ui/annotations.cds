using AdminService as service from '../../srv/admin-service';

// Enable CRUD operations for Books entity
annotate service.Books with @(
    Capabilities.InsertRestrictions.Insertable : true,
    Capabilities.UpdateRestrictions.Updatable : true,
    Capabilities.DeleteRestrictions.Deletable : true,
);

// Enhanced Books entity annotations for admin management
annotate service.Books with @(
    UI.HeaderInfo : {
        $Type : 'UI.HeaderInfoType',
        TypeName : 'Book',
        TypeNamePlural : 'Books',
        Title : {
            $Type : 'UI.DataField',
            Value : title,
        },
        Description : {
            $Type : 'UI.DataField',
            Value : author.name,
        },
    },
    UI.SelectionFields : [
        title,
        author_ID,
        publisher,
        language,
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Title',
            Value : title,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Author',
            Value : author.name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'ISBN',
            Value : isbn,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Price',
            Value : price,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Stock',
            Value : stock,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Publisher',
            Value : publisher,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Language',
            Value : language,
        },
    ],
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'BasicInfoFacet',
            Label : 'Basic Information',
            Target : '@UI.FieldGroup#BasicInfo',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'PublishingFacet',
            Label : 'Publishing Details',
            Target : '@UI.FieldGroup#PublishingInfo',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'InventoryFacet',
            Label : 'Inventory & Pricing',
            Target : '@UI.FieldGroup#InventoryInfo',
        },
    ],
    UI.FieldGroup #BasicInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Title',
                Value : title,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Author',
                Value : author_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'ISBN',
                Value : isbn,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Description',
                Value : description,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Image URL',
                Value : imageUrl,
            },
        ],
    },
    UI.FieldGroup #PublishingInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Publisher',
                Value : publisher,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Published Date',
                Value : publishedDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Language',
                Value : language,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Pages',
                Value : pages,
            },
        ],
    },
    UI.FieldGroup #InventoryInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Price (€)',
                Value : price,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Stock Quantity',
                Value : stock,
            },
        ],
    },
);

// Field-level annotations for better user experience
annotate service.Books with {
    ID @(
        UI.Hidden : true,
        Core.Computed : true,
    );
    title @(
        title : 'Book Title',
        Common.Label : 'Title',
        UI.Placeholder : 'Enter book title...',
    );
    isbn @(
        title : 'ISBN',
        Common.Label : 'ISBN',
        UI.Placeholder : 'Enter ISBN (e.g., 978-3-16-148410-0)',
    );
    description @(
        title : 'Description',
        Common.Label : 'Description',
        UI.MultiLineText : true,
        UI.Placeholder : 'Enter book description...',
    );
    price @(
        title : 'Price',
        Common.Label : 'Price (€)',
        UI.Placeholder : '0.00',
        Measures.ISOCurrency : 'EUR',
    );
    stock @(
        title : 'Stock Quantity',
        Common.Label : 'Stock',
        UI.Placeholder : '0',
    );
    imageUrl @(
        title : 'Image URL',
        Common.Label : 'Image URL',
        UI.Placeholder : 'https://example.com/book-cover.jpg',
    );
    publishedDate @(
        title : 'Published Date',
        Common.Label : 'Published',
    );
    publisher @(
        title : 'Publisher',
        Common.Label : 'Publisher',
        UI.Placeholder : 'Enter publisher name...',
    );
    language @(
        title : 'Language',
        Common.Label : 'Language',
        UI.Placeholder : 'English',
    );
    pages @(
        title : 'Number of Pages',
        Common.Label : 'Pages',
        UI.Placeholder : '0',
    );
    author @(
        title : 'Author',
        Common.Label : 'Author',
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Authors',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : author_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'biography',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'birthDate',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'nationality',
                },
            ],
        }
    );
    // Computed fields should be hidden in create/edit forms
    createdAt @UI.Hidden : true;
    createdBy @UI.Hidden : true;
    modifiedAt @UI.Hidden : true;
    modifiedBy @UI.Hidden : true;
};

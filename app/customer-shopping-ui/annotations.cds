using CustomerService as service from '../../srv/customer-service';

// UI Annotations for Books List Report (Customer Shopping specific)
annotate service.Books with @(
    UI.FieldGroup #CustomerGroup : {
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
                Value : author.name,
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
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'CustomerFacet1',
            Label : 'Book Information',
            Target : '@UI.FieldGroup#CustomerGroup',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'CustomerReviewsFacet',
            Label : 'Customer Reviews',
            Target : 'reviews/@UI.LineItem',
        },
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
            Label : 'Price',
            Value : price,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Stock Available',
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
    UI.HeaderInfo : {
        Title : {
            $Type : 'UI.DataField',
            Value : title,
        },
        TypeName : 'Book',
        TypeNamePlural : 'Books',
        Description : {
            $Type : 'UI.DataField',
            Value : author.name,
        },
        ImageUrl : imageUrl,
    },
    UI.SelectionFields : [
        title,
        author_ID,
        publisher,
        language,
    ],
);

// UI Annotations for Authors (for value help)
annotate service.Authors with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Name',
            Value : name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Biography',
            Value : biography,
        },
    ],
);

// UI Annotations for Categories (for value help)
annotate service.Categories with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Name',
            Value : name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Description',
            Value : description,
        },
    ],
);

// UI Annotations for Reviews (for the reviews facet in Books object page)
annotate service.MyReviews with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Rating',
            Value : rating,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Title',
            Value : title,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Comment',
            Value : comment,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Review Date',
            Value : createdAt,
        },
    ],
);

// Value Help annotations for customer shopping
annotate service.Books with {
    author @(
        Common.Text : author.name,
        Common.TextArrangement : #TextOnly,
    );
};

// Field control for better UX
annotate service.Books with {
    title @title : 'Book Title';
    price @title : 'Price (€)';
    stock @title : 'Available Stock';
    description @UI.MultiLineText : true;
};

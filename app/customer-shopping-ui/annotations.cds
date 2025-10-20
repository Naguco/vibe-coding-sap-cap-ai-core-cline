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

// Shopping Cart Actions on Books
annotate service.Books with @(
    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'CustomerService.addToCart',
            Label : 'Add to Cart',
            Inline : true,
        },
    ],
);


// UI Annotations for Shopping Cart
annotate service.MyShoppingCart with @(
    UI.HeaderInfo : {
        Title : {
            $Type : 'UI.DataField',
            Value : 'Shopping Cart',
        },
        TypeName : 'Shopping Cart',
        TypeNamePlural : 'Shopping Carts',
        Description : {
            $Type : 'UI.DataField',
            Value : status,
        },
    },
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Status',
            Value : status,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Total Items',
            Value : totalItems,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Total Amount',
            Value : totalAmount,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Created At',
            Value : createdAt,
        },
    ],
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'CartItemsFacet',
            Label : 'Cart Items',
            Target : 'items/@UI.LineItem',
        },
    ],
    UI.FieldGroup #CartDetails : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Status',
                Value : status,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Total Items',
                Value : totalItems,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Total Amount (€)',
                Value : totalAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Created At',
                Value : createdAt,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Last Modified',
                Value : modifiedAt,
            },
        ],
    },
    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'CustomerService.clearCart',
            Label : 'Clear Cart',
            Inline : true,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'CustomerService.purchaseFromCart',
            Label : 'Purchase All Items',
            Inline : true,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'CustomerService.getCartSummary',
            Label : 'Get Cart Summary',
            Inline : true,
        },
    ],
);

// UI Annotations for Shopping Cart Items
annotate service.MyShoppingCartItems with @(
    UI.HeaderInfo : {
        Title : {
            $Type : 'UI.DataField',
            Value : book.title,
        },
        TypeName : 'Cart Item',
        TypeNamePlural : 'Cart Items',
        Description : {
            $Type : 'UI.DataField',
            Value : book.author.name,
        },
        ImageUrl : book.imageUrl,
    },
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Book Title',
            Value : book.title,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Author',
            Value : book.author.name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Unit Price',
            Value : unitPrice,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Quantity',
            Value : quantity,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Subtotal',
            Value : subtotal,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Added At',
            Value : createdAt,
        },
    ],
    UI.FieldGroup #CartItemDetails : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Book Title',
                Value : book.title,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Author',
                Value : book.author.name,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Publisher',
                Value : book.publisher,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Unit Price (€)',
                Value : unitPrice,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Quantity',
                Value : quantity,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Subtotal (€)',
                Value : subtotal,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Added At',
                Value : createdAt,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'CartItemDetailsFacet',
            Label : 'Item Details',
            Target : '@UI.FieldGroup#CartItemDetails',
        },
    ],
    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'CustomerService.updateCartItem',
            Label : 'Update Quantity',
            Inline : true,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'CustomerService.removeFromCart',
            Label : 'Remove from Cart',
            Inline : true,
        },
    ],
);

// Field control for shopping cart entities
annotate service.MyShoppingCart with {
    status @title : 'Cart Status';
    totalItems @title : 'Total Items';
    totalAmount @title : 'Total Amount (€)';
};

annotate service.MyShoppingCartItems with {
    quantity @title : 'Quantity';
    unitPrice @title : 'Unit Price (€)';
    subtotal @title : 'Subtotal (€)';
};

// Value Help for shopping cart items
annotate service.MyShoppingCartItems with {
    book @(
        Common.Text : book.title,
        Common.TextArrangement : #TextOnly,
    );
};

sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"bookstore/admin/adminmanagementui/test/integration/pages/BooksList",
	"bookstore/admin/adminmanagementui/test/integration/pages/BooksObjectPage"
], function (JourneyRunner, BooksList, BooksObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('bookstore/admin/adminmanagementui') + '/test/flpSandbox.html#bookstoreadminadminmanagementu-tile',
        pages: {
			onTheBooksList: BooksList,
			onTheBooksObjectPage: BooksObjectPage
        },
        async: true
    });

    return runner;
});


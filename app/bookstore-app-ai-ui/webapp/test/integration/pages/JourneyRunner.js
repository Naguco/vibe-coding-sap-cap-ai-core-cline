sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"bookstoreappaiui/test/integration/pages/BooksList",
	"bookstoreappaiui/test/integration/pages/BooksObjectPage",
	"bookstoreappaiui/test/integration/pages/MyReviewsObjectPage"
], function (JourneyRunner, BooksList, BooksObjectPage, MyReviewsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('bookstoreappaiui') + '/test/flp.html#app-preview',
        pages: {
			onTheBooksList: BooksList,
			onTheBooksObjectPage: BooksObjectPage,
			onTheMyReviewsObjectPage: MyReviewsObjectPage
        },
        async: true
    });

    return runner;
});


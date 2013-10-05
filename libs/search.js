/**
 * client-side-search-boilerplate
 * See: https://github.com/CBCMusic/client-side-search-boilerplate
 * @author Ben Keen
 */
(function() {
    "use strict";

    // DOM elements
    var _resultsPanelId    = "#sbResultsPanel";
    var _sortById          = "#sbSortBy";
    var _searchFieldId     = "#sbSearchField";
    var _paginationFieldId = "#sbPagination";
    var _prevNextFieldId   = "#sbPrevNextButtons";
    var _navigationFieldId = "#sbNavigation";

    // config settings
    var _numPerPage = 10;
    var _maxPaginationLinks = 15;
	var _dataPropertiesToSearch = ["name", "phone", "dob"]; // needs to be customized based on the content of your data

    // our underscore templates
    var _noResultsTemplate = null;
    var _hasResultsTemplate = null;
    var _resultRowTemplate = null;
    var _paginationTemplate = null;
    var _prevNextTemplate = null;

    // set the underscore delimiters to <@ @> (this was done to prevent conflicts with ASP, but remove if you want)
    _.templateSettings = {
        interpolate: /\<\@\=(.+?)\@\>/gim,
        evaluate: /\<\@(.+?)\@\>/gim,
        escape: /\<\@\-(.+?)\@\>/gim
    };

    // misc "global-ish" private vars
    var _data = {};
    var _currPage = 1;


	/**
	 * Called on DOM ready. Sets up the search.
	 * @private
	 */
    var _init = function() {

        $(_sortById).on("click", "a", _onChangeSort);
        $(_paginationFieldId).on("click", "a", _onClickPagination);
        $(_prevNextFieldId).on("click", "a", _onClickPrevNext);
        $(_searchFieldId).on("keyup", _search);

        // store the templates
        _noResultsTemplate  = _.template($("#sbNoResultsTemplate").html());
        _hasResultsTemplate = _.template($("#sbHasResultsTemplate").html());
        _resultRowTemplate  = _.template($("#sbResultRowTemplate").html());
        _paginationTemplate = _.template($("#sbPaginationTemplate").html());
        _prevNextTemplate   = _.template($("#sbPrevNextTemplate").html());

		// tie in our data source. This would probably be done in an Ajax request to the server to return
		// the data. Right now, this just pulls from demo-data.js
		_data = dataSource;

        _search();
    };

    var _getSearchParams = function () {
        return {
			searchStr: $(_searchFieldId).val(),
            sortBy: $(_sortById).find(".selected").data("sortAttr")
        };
    };

    var _onChangeSort = function(e) {
		e.preventDefault();

        $(_sortById).find("a.selected").removeClass("selected");
        $(e.target).addClass("selected");

        // apply the new sort
        _sortData();

		// re-search
        _search();
    };

    var _onClickPagination = function(e) {
		e.preventDefault();
        var newPage = parseInt($(e.target).html(), 10);
        _selectPage(newPage);
    };

    var _onClickPrevNext = function(e) {
		e.preventDefault();

        var direction = $(e.target).hasClass("sbPagePrev") ? "prev" : "next";

        // blithe assumption that this can never be out of bounds... but okay
        var nextPageNum = null;
        if (direction === "next") {
            nextPageNum = _currPage + 1;
        } else {
            nextPageNum = _currPage - 1;
        }

        _selectPage(nextPageNum);
    };

    /**
     * Used by the pagination and next/prev links to select a new page. Contains the logic for updating
     * the content and the nav.
     */
    var _selectPage = function(newPage) {
        var searchParams = _getSearchParams();
        var filteredResults = _filterBySearchTerm(_data, searchParams.searchStr);
        var numPages = Math.ceil(filteredResults.length / _numPerPage);

        var startIndex = 0;
        if (newPage > 1) {
            startIndex = (newPage - 1) * _numPerPage;
        }

        filteredResults = filteredResults.slice(startIndex, startIndex + _numPerPage);
        var rows = _resultRowTemplate({ results: filteredResults });
        var html = _hasResultsTemplate({ rows: rows });

		$(_resultsPanelId).html(html);

        _updateNavigation(newPage, numPages);
        _currPage = newPage;
    };

	var _search = function() {
		var searchParams = _getSearchParams();
        var filteredResults = _filterBySearchTerm(_data, searchParams.searchStr);
        var numPages = Math.ceil(filteredResults.length / _numPerPage);

        var html = "";
        if (filteredResults.length === 0) {
            html = _noResultsTemplate();
            numPages = 0;
        } else {
            var hasMoreResults = filteredResults.length > _numPerPage;
            
            // limit the results to 10, or whatever default is set
            if (hasMoreResults) {
                filteredResults = filteredResults.slice(0, _numPerPage);
            }
            var rows = _resultRowTemplate({ results: filteredResults });
            html = _hasResultsTemplate({
                hasMoreResults: hasMoreResults,
                rows: rows
            });
        }

        $(_resultsPanelId).html(html);
        _updateNavigation(1, numPages);
        _currPage = 1;
    };

    var _filterBySearchTerm = function(data, searchStr) {
        var numFieldsToSearch = _dataPropertiesToSearch.length;
        var searchStr = $.trim(searchStr);
        searchStr = searchStr.replace(/[^a-zA-Z0-9]/g, "");
        var searchTermRegExp = new RegExp(searchStr, "i");

        var filteredResults = [];
        if (searchStr === "") {
            filteredResults = data;
        } else {
            for (var i=0, j=data.length; i<j; i++) {
                var currItem = data[i];
                var matches = false;
                for (var k=0; k<numFieldsToSearch; k++) {
                    if (currItem[_dataPropertiesToSearch[k]] === null) {
                        continue;
                    }
                    if (searchTermRegExp.test(currItem[_dataPropertiesToSearch[k]])) {
                        matches = true;
                        break;
                    }
                }
                if (matches) {
                    filteredResults.push(currItem);
                }
            }
        }
        
        return filteredResults;
    };

    var _updateNavigation = function(currPage, numPages) {
        var lastPage = (numPages > _maxPaginationLinks) ? _maxPaginationLinks : numPages;

        if (numPages <= 1) {
            $(_paginationFieldId).hide();
            $(_navigationFieldId).hide();
        } else {
            var pageNums = [];            
            for (var i=1; i<=lastPage; i++) {
                pageNums.push(i);
            }
            var html = _paginationTemplate({
                currPage: currPage,
                pages: pageNums,
                showMorePages: lastPage < numPages
            });

            $(_paginationFieldId).show();
            $(_paginationFieldId).html(html);
        }
        
        // now update the prev/next links
        if (numPages <= 1) {
            $(_prevNextFieldId).hide();
        } else {
            var showPrevLink = false;
            var showNextLink = false;
            if (numPages > 1) {
                if (currPage > 1) {
                    showPrevLink = true;
                }
                if (currPage < lastPage) {
                    showNextLink = true;
                }
            }
            var prevNextHtml = _prevNextTemplate({
                showPrevLink: showPrevLink,
                showNextLink: showNextLink
            });
            $(_prevNextFieldId).html(prevNextHtml).show();
            $(_navigationFieldId).show();
        }
    };


    /**
     * Used onload and whenever a user clicks one of the sorting links. It's used to change the 
     * actual _data[questionID] array, so subsequent functions don't have to worry about taking into
     * account the order; it'll be done for them already.
     */
    var _sortData = function() {
        var sortOrder = $(_sortById).find("a.selected").data("sortAttr");

        if (sortOrder === "[RANDOM]") {
			_data = _randomizeArray(_data);
        } else {

			// TODO needs to sort alphabetically
			_data.sort(function(a, b) {
				var id1 = a[sortOrder];
				var id2 = b[sortOrder];
				if (id1 < id2) {
					return -1;
				} else if (id1 > id2) {
					return 1;
				}
				return 0;
			});
        }
    };

    var _randomizeArray = function(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // and swap it with the current element
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    };


    // initialize the sucker! (this is shorthand for "on DOM-ready, execute _init function")
    $(_init);

})();
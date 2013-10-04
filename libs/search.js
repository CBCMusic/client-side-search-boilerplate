(function() {
    "use strict";

    // DOM elements
    var _resultsPanelId = "resultsPanel";
    var _questionListSelector = ".votingFilter ul";    
    var _pollSortById = "pollSortBy";
    var _searchFieldId = "pollSearch";
    var _paginationFieldId = "pollPagination";
    var _prevNextFieldId = "pollPrevNextButtons";
    var _loadingFieldId = "pollLoading";
    var _pollTitle = "pollTitle";
    var _pollPlayAllBtn = "pollPlayAllBtn";
    var _pollNavigation = "pollNavigation";
    var _resultsElement = null;
    var _questionListElement = null;

    // config settings
    var _numPerPage = 10;
    var _maxPaginationLinks = 15;

    // our underscore templates
    var _pollNoResultsTemplate = null;
    var _pollHasResultsTemplate = null;
    var _pollResultRowTemplate = null;
    var _pollPaginationTemplate = null;
    var _pollPrevNextTemplate = null;

    // set the underscore delimiters to {{ }} to prevent conflicts with the ASP
    _.templateSettings = {
        interpolate: /\<\@\=(.+?)\@\>/gim,
        evaluate: /\<\@(.+?)\@\>/gim,
        escape: /\<\@\-(.+?)\@\>/gim
    };

    // misc "global-ish" private vars
    var _data = {};
    var _currentQuestionId = null;
    var _currPage = 1;

    var _init = function() {
        
        // init various the event handlers
        _questionListElement = $$(_questionListSelector)[0];

        // initialize the title + play all button href
        var currItem = _questionListElement.down("a.selected");
        $(_pollTitle).innerHTML = currItem.innerHTML;
        var searchParams = _getSearchParams();
        _currentQuestionId = searchParams.PollQuestionId;
        $(_pollPlayAllBtn).down("a").writeAttribute("href", "/playlists/pollquestion/" + _currentQuestionId);

        _questionListElement.on("click", "a", _onSelectNewQuestion);
        $(_pollSortById).on("click", "a", _onChangeSort);
        $(_paginationFieldId).on("click", "a", _onClickPagination);
        $(_prevNextFieldId).on("click", "a", _onClickPrevNext);
        $(_searchFieldId).on("keyup", _search);

        _resultsElement = $(_resultsPanelId);

        // store the templates
        _pollNoResultsTemplate = _.template($("pollNoResultsTemplate").innerHTML);
        _pollHasResultsTemplate = _.template($("pollHasResultsTemplate").innerHTML);
        _pollResultRowTemplate = _.template($("pollResultRowTemplate").innerHTML);
        _pollPaginationTemplate = _.template($("pollPaginationTemplate").innerHTML);
        _pollPrevNextTemplate = _.template($("pollPrevNextTemplate").innerHTML);

        _search();
    };

    var _getSearchParams = function () {
        return {
            PollQuestionId: _extractQuestionId(_questionListElement.down("a.selected").readAttribute("href")),
            SearchOrder: 1, // always search by most recent. We'll handle randomization on the client
            SearchTerm: $(_searchFieldId).value,
            Size: 1000
        };
    };

    var _onSelectNewQuestion = function(e, el) {
        Event.stop(e);

        // select the new item and de-select the old
        var currItem = _questionListElement.down("a.selected");
        currItem.removeClassName("selected");
        $(el).addClassName("selected");
        $(_pollTitle).innerHTML = el.innerHTML;
        
        // update the playlist Play All href
        $(_pollPlayAllBtn).down("a").writeAttribute("href", "/playlists/pollquestion/" + _currentQuestionId);

        // do a fresh search
        _search();
    };

    var _onChangeSort = function(e, el) {
        Event.stop(e);

        $(_pollSortById).down("a.selected").removeClassName("selected");
        $(el).addClassName("selected");

        // apply the new sort
        _sortData(_currentQuestionId);

        var searchParams = _getSearchParams();
        _updateResults(searchParams);
    };

    var _onClickPagination = function(e) {
        Event.stop(e);

        var newPage = parseInt(e.target.innerHTML, 10);
        _selectPage(newPage);
    };

    var _onClickPrevNext = function(e) {
        Event.stop(e);

        var direction = $(e.target).hasClassName("pollPagePrev") ? "prev" : "next";

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
        var results = _data[_currentQuestionId];
        var searchParams = _getSearchParams();
        var filteredResults = _filterBySearchTerm(results, searchParams.SearchTerm);
        var numPages = Math.ceil(filteredResults.length / _numPerPage);

        var startIndex = 0;
        if (newPage > 1) {
            startIndex = ((newPage - 1) * _numPerPage);
        }
        filteredResults = filteredResults.slice(startIndex, startIndex + _numPerPage);

        var rows = _pollResultRowTemplate({ results: filteredResults });
        var html = _pollHasResultsTemplate({ rows: rows });
        _resultsElement.innerHTML = html;

        _updatePollNavigation(newPage, numPages);
        _currPage = newPage;
    };

    /**
     * This is called after a search, when the user clicks on one of the sorting options. It re-draws 
     * the (first!) page according to the current search criteria.
     */
    var _updateResults = function(searchParams) {
        var results = _data[_currentQuestionId];
        var filteredResults = _filterBySearchTerm(results, searchParams.SearchTerm);
        var numPages = Math.ceil(filteredResults.length / _numPerPage);

        var html = "";
        if (filteredResults.length === 0) {
            html = _pollNoResultsTemplate();
            numPages = 0;
        } else {
            var hasMoreResults = filteredResults.length > _numPerPage;
            
            // limit the results to 10, or whatever default is set
            if (hasMoreResults) {
                filteredResults = filteredResults.slice(0, _numPerPage);
            }
            var rows = _pollResultRowTemplate({ results: filteredResults });
            html = _pollHasResultsTemplate({
                hasMoreResults: hasMoreResults,
                rows: rows
            });
        }

        _resultsElement.innerHTML = html;        
        _updatePollNavigation(1, numPages);
        _currPage = 1;
    };

    var _search = function() {
        var searchParams = _getSearchParams();
        _currentQuestionId = searchParams.PollQuestionId;
        
        // see if we've already got the data back for this question. If so, we can do it all client-side
        if (_data.hasOwnProperty(_currentQuestionId)) {
            _updateResults(searchParams);

        // nope? Do a fresh Ajax request for the info
        } else {
            $(_loadingFieldId).addClassName("pollLoading");

            var onSuccess = function (response) {
                $(_loadingFieldId).removeClassName("pollLoading");
                _data[_currentQuestionId] = response.SearchResults;

                // always sort the data onload
                if (response.SearchResults.length > 0) {
                    _sortData(_currentQuestionId);
                }
                _updateResults(searchParams);
            };
            var onError = function() {
                $(_loadingFieldId).removeClassName("pollLoading");
                console.log("error: ", arguments);
            };

            Web.polls.services.PollWebService.GetByQuestionId(searchParams, onSuccess, onError);
        }
    };

    var _filterBySearchTerm = function(data, searchTerm) {
        var fieldsToSearch = ["BandName", "Header", "Title"];
        var numFieldsToSearch = fieldsToSearch.length;
        var searchStr = searchTerm.strip();
        searchStr = searchStr.replace(/[^a-zA-Z0-9]/g, "");
        var searchTermRegExp = new RegExp(searchStr, "i");

        var filteredResults = [];
        if (searchTerm === "") {
            filteredResults = data;
        } else {
            for (var i=0, j=data.length; i<j; i++) {
                var currItem = data[i];
                var matches = false;
                for (var k=0; k<numFieldsToSearch; k++) {
                    // don't want to do a string test because it'll be slow... this should do.
                    if (currItem[fieldsToSearch[k]] === null) {
                        continue;
                    }
                    if (searchTermRegExp.test(currItem[fieldsToSearch[k]])) {
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

    var _updatePollNavigation = function (currPage, numPages) {
        var lastPage = (numPages > _maxPaginationLinks) ? _maxPaginationLinks : numPages;

        if (numPages <= 1) {
            $(_paginationFieldId).hide();
            $(_pollNavigation).hide();
        } else {
            var pageNums = [];            
            for (var i=1; i<=lastPage; i++) {
                pageNums.push(i);
            }
            var html = _pollPaginationTemplate({
                currPage: currPage,
                pages: pageNums,
                showMorePages: lastPage < numPages
            });

            $(_paginationFieldId).show();
            $(_paginationFieldId).innerHTML = html;
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
            var prevNextHtml = _pollPrevNextTemplate({
                showPrevLink: showPrevLink,
                showNextLink: showNextLink
            });
            $(_prevNextFieldId).show();
            $(_prevNextFieldId).innerHTML = prevNextHtml;
            $(_pollNavigation).show();
        }
    };


    /**
     * Used onload and whenever a user clicks one of the sorting links. It's used to change the 
     * actual _data[questionID] array, so subsequent functions don't have to worry about taking into
     * account the order; it'll be done for them already.
     */
    var _sortData = function(questionID) {
        var sortOrder = $(_pollSortById).down("a.selected").readAttribute("data-sort-id");

        if (sortOrder === "1") {
            // this cheats a bit. The ID always increments, so we use that to determine the "most recent"
            // value, rather than parsing the awful 
            _data[_currentQuestionId].sort(function (a, b) {
                var id1 = parseInt(a.Id, 10);
                var id2 = parseInt(b.Id, 10);
                if (id1 < id2) {
                    return 1;
                } else if (id1 > id2) {
                    return -1;
                }
                return 0;
            });
        } else {
            _data[_currentQuestionId] = _randomizeArray(_data[_currentQuestionId]);
        }
    };

    var _randomizeArray = function(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    };
    

    // poor, but needed for compatibility with old code
    var _extractQuestionId = function (str) {
        var parts = str.split("#");
        return parts[1].replace(/^q/, "");
    };


    // initialize the sucker!
    document.observe("dom:loaded", _init);

})();
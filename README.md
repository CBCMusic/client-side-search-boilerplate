# client-side-search-boilerplate

This repo is a simple JS library and example implementation for searching an array of objects (any structure), and for
providing common UI elements around the search: *pagination*, *prev/next links* and *sorting*. It's really just a
boilerplate ready for customization: you'll need to tweak it to pass in the appropriate data, customize the markup
so it displays whatever information you want. But the idea is that it can work with any old data set, as long as it's
in an array of objects. Most likely you'd use an Ajax request to get the info to the client (we do).

### Why?

Sometimes when you have a relatively small data set, you can dole the entire thing up to the client and move all
searching, pagination and so forth into the javascript. This makes for a far better user experience. I've had to do
this very task maybe a dozen times over my career, and always end up writing the same code again and again. No more!

### Features
- lets you search an array of objects, where the objects are of any structure. You specify which object keys should
be included in the search
- automatic pagination (1 2 3 ...) generated,
- prev-next links
- sorting options (example: random and by specific object key)
- no images; all CSS is customizable so you can make it look however you want.

### Dependencies

Underscore and jQuery. Underscore is used purely for `_.template()`, so it's easy to switch out if you had a
different client-side templating language in mind. jQuery is used because, hey, it's frickin' handy and there's a fair bit
of DOM manipulation done.

### How to implement

Load up the `index.html` file and see how it works, then edit the code and underscore templates. You'll almost certainly
want to customize the CSS to make it fit into your site. This is kind of a hands-on script. :) But here's a few more details.

#### Settings
If you check out the top of the `/libs/search.js` file, you'll see three settings:

    // config settings
    var _numPerPage = 10;
    var _maxPaginationLinks = 15;
	var _dataPropertiesToSearch = ["name", "phone", "dob"]; // needs to be customized based on the content of your data

The last one MUST be customized. It specifies which properties in your array of objects you want the search to recognize.

#### Customizing the visible sort options
The sort options reflect your data set. In the demo, you'll see there's a `Random`, `Name`, `Phone` and `Date of Bird`
sort option. These are mapped to properties in the `demo-data.js` file via the `data-sort-attr` attribute. You can
see the sorting is very basic: it only sorts in a single direction, and it's not correct for the Date of Birth field. This
is because it searches alphabetically, not according to date. To fix that, you could add a new property to the data array
with (say) a unixtime version of the dates and search on that. Alternatively, you can always edit the JS to do a custom
sort based on that field.

`Random` is a special sort option. If that's included with a `data-sort-attr="[RANDOM]"` value, it will automatically
randomize the results.

### Other notes
- to make the script as conflict-free as possible, the JS is namespaced via an anonymous self-invoked function; JS ids
and classes are prefixed with `sb`; the CSS ids and classes are all prefixed with *sb-*.
- the CSS file is written so you can just drop it into your site. The custom page styles in `index.html` are just for the
sake of the demo.
- The search functionality is really pretty basic, but for small data sets is probably sufficient. It only searchs a-z, A-Z,
and 0-9 characters. Everything else is ignored. There are no wildcards or anything special like that (but if you add them,
send along a pull request - it'd be a nice addition).
- The default search order is whatever order the results appear in the data source.

### Demo

See: [http://cbcmusic.github.io/client-side-search-boilerplate/](http://cbcmusic.github.io/client-side-search-boilerplate/)

- Ahmed Khalil, original design
- Ben Keen, code


































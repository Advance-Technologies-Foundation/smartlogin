# smartlogin
Add-on replaced BaseViewModule and analyze on PageLoad browser state, if state is empty he tried restore it from browser local storage.
If local storage not contains state data, add-in call base logical for search home page.
Data in local storage are stored on event change or replace state in app.

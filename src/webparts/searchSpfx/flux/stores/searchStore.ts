import appDispatcher from '../dispatcher/appDispatcher';
import searchActionIDs from '../actions/searchActionIDs';
import { EventEmitter } from 'events';

import { IWebPartContext } from '@microsoft/sp-client-preview';
import { ISearchResults, ICells, ICellValue } from '../../utils/ISearchResults';

const CHANGE_EVENT: string = 'change';

export class SearchStoreStatic extends EventEmitter {
	private _results: any[] = [];

	/**
	 * @param {function} callback
	 */
	public addChangeListener(callback: Function): void {
        this.on(CHANGE_EVENT, callback);
    }

	/**
	 * @param {function} callback
	 */
    public removeChangeListener(callback: Function): void {
        this.removeListener(CHANGE_EVENT, callback);
    }

    public emitChange(): void {
        this.emit(CHANGE_EVENT);
    }

	public getSearchResults(): ICells[] {
		return this._results;
	}

	public setSearchResults(crntResults: ICells[], fields: string): void {
		const flds: string[] = fields.toLowerCase().split(',');
		if (crntResults.length > 0) {
			const temp: any[] = [];
			crntResults.forEach((result) => {
				// Create a temp value
				var val: Object = {};
				result.Cells.forEach((cell: ICellValue) => {
					if (flds.indexOf(cell.Key.toLowerCase()) !== -1) {
						// Add key and value to temp value
						val[cell.Key] = cell.Value;
					}
				});
				// Push this to the temp array
				temp.push(val);
			});
			this._results = temp;
		} else {
			this._results = [];
		}
	}

	/**
	 * @param {IWebPartContext} context
	 * @param {string} url
	 */
	public GetSearchData (context: IWebPartContext, url: string): Promise<ISearchResults> {
		return context.httpClient.get(url).then((res: Response) => {
			return res.json();
		});
	}
}

const searchStore: SearchStoreStatic = new SearchStoreStatic();

appDispatcher.register((action) => {
	switch (action.actionType) {
		case searchActionIDs.SEARCH_GET:
			let url: string = action.context.pageContext.web.absoluteUrl + "/_api/search/query?querytext=";
			// Check if a query is provided
			if (action.query !== null && action.query !== "") {
				url += `'${action.query}'`;
			} else {
				url += "'*'";
			}
			// Check if there are fields provided
			url += '&selectproperties=';
			if (action.fields !== null && action.fields !== "") {
				url += `'${action.fields}'`;
			} else {
				url += "'path,title'";
			}

			searchStore.GetSearchData(action.context, url).then((res: ISearchResults) => {
				if (res !== null) {
					if (typeof res.PrimaryQueryResult !== 'undefined') {
						if (typeof res.PrimaryQueryResult.RelevantResults !== 'undefined') {
							if (typeof res.PrimaryQueryResult.RelevantResults !== 'undefined') {
								if (typeof res.PrimaryQueryResult.RelevantResults.Table !== 'undefined') {
									if (typeof res.PrimaryQueryResult.RelevantResults.Table.Rows !== 'undefined') {
										searchStore.setSearchResults(res.PrimaryQueryResult.RelevantResults.Table.Rows, action.fields);
										searchStore.emitChange();
									}
								}
							}
						}
					}
				}
			});

			break;
	}
});


export default searchStore;
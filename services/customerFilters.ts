import type {Contact,Category} from '../types.ts';
import {categoryIds} from './contactIdentity.ts';
export function matchesCustomerFilters(c:Contact,tags:Set<string>,selected:Set<string>,categories:Category[]){
 const ids=categoryIds(c).filter(id=>categories.some(category=>category.id===id));
 return (!tags.size||c.tags.some(tag=>tags.has(tag)))&&(!selected.size||ids.some(id=>selected.has(id)));
}

import { InvokeHooks, RoleRegistry } from 'rhachet';

import { getRoleRegistry as getRoleRegistryEhmpathy, getInvokeHooks as getInvokeHooksEhmpathy } from 'rhachet-roles-ehmpathy';

export const getRoleRegistries = (): RoleRegistry[] => [getRoleRegistryEhmpathy()];
export const getInvokeHooks = (): InvokeHooks[] => [getInvokeHooksEhmpathy()];

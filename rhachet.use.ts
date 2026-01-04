import type { InvokeHooks, RoleRegistry } from 'rhachet';

import { getRoleRegistry as getRoleRegistryBhuild, getInvokeHooks as getInvokeHooksBhuild } from 'rhachet-roles-bhuild';
import { getRoleRegistry as getRoleRegistryEhmpathy, getInvokeHooks as getInvokeHooksEhmpathy } from 'rhachet-roles-ehmpathy';

export const getRoleRegistries = (): RoleRegistry[] => [getRoleRegistryBhuild(), getRoleRegistryEhmpathy()];
export const getInvokeHooks = (): InvokeHooks[] => [getInvokeHooksBhuild(), getInvokeHooksEhmpathy()];

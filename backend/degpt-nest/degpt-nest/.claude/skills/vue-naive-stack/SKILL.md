---
name: vue-naive-stack
description: 'Standardized Vue 3 SPA workflow. Stack: Vue 3 (Script Setup), Naive UI, Tailwind CSS 4, VueUse, TypeScript. Focus on component splitting (Atomic/Logical) and VueUse hooks.'
version: 1.0.0
---

# Vue 3 Naive Stack - Development Standard

This skill guides the development of Single Page Applications (SPA) using the **Vue 3 + Naive UI + Tailwind 4** stack. The goal is to build maintainable, component-driven, and type-safe applications.

## 🛠 Core Tech Stack Reference

| Category       | Technology   | Version | Key Guideline                                             |
| -------------- | ------------ | ------- | --------------------------------------------------------- |
| **Framework**  | Vue 3        | Latest  | Use `<script setup lang="ts">`. SPA mode.                 |
| **UI Library** | **Naive UI** | Latest  | **PRIORITY**. Use `<n-config-provider>` for global theme. |
| **Styling**    | Tailwind CSS | **4.0** | Use for Layout, Spacing, and Typography.                  |
| **Logic**      | **VueUse**   | Latest  | Check VueUse docs before writing custom `composables`.    |
| **Icons**      | @iconify/vue | Latest  | Import `Icon`: `<Icon icon="mdi:home" />`.                |
| **Language**   | TypeScript   | 5+      | Strict typing. Avoid `any`.                               |
| **Router**     | Vue Router   | 4+      | Standard SPA routing.                                     |

---

## 🧠 Decision Algorithm (How to think)

When User requests a feature/page, follow this logic:

1.  **Component Architecture (The "Split" Rule)**:
    - _Analysis_: Is the feature complex (e.g., a Dashboard or settings page)?
    - _Action_: **Do not** write everything in one file. Split into:
      - `ParentPage.vue` (Layout & Data orchestration)
      - `components/FeatureHeader.vue`
      - `components/FeatureList.vue`
      - `components/FeatureActions.vue`
    - _Threshold_: If a component exceeds ~250 lines, look for opportunities to extract sub-components.

2.  **UI Component Strategy**:
    - First, search **Naive UI**.
    - Use `<n-button>`, `<n-card>`, `<n-data-table>`, `<n-modal>`.
    - Do not write custom CSS for buttons or inputs; use Naive UI props (`type`, `size`, `dashed`).

3.  **Logic Strategy (VueUse First)**:
    - Need to watch local storage? -> `useStorage`.
    - Need to track window size? -> `useWindowSize`.
    - Need copy to clipboard? -> `useClipboard`.
    - Dark mode? -> `useDark` + `useToggle`.

4.  **Styling Strategy**:
    - Use Tailwind 4 for _positioning_ (flex, grid, margin, padding) and _colors_.
    - Use Naive UI for _component behavior_ and _internal styles_.
5.  **Complexity Management (Refactoring Strategy)**:
    - _Trigger_: The logic is getting tangled, or the script section is too long.
    - _Extract Hooks_: Move stateful logic (watchers, computed, async calls) into **Composables** (e.g., `composables/useOrderLogic.ts`).
    - _Extract Utils_: Move pure functions (formatting dates, calculating totals, regex validation) into **Utils** (e.g., `utils/format.ts`).
    - _Goal_: The `.vue` file should be thin—handling UI events and binding data only.

---

## 📐 Coding Standards & Patterns

### 1. Smart Component Splitting (The "Split" Rule)

**❌ Bad (Monolithic):**
`UserProfile.vue` (800 lines containing Header, Form, and Activity Log).

**✅ Good (Modular):**

```tsx
// views/UserProfile/UserProfile.vue
<script setup lang="ts">
import ProfileHeader from './components/ProfileHeader.vue';
import SettingsForm from './components/SettingsForm.vue';
import ActivityLog from './components/ActivityLog.vue';
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <ProfileHeader :user="user" />
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SettingsForm class="lg:col-span-2" />
      <ActivityLog class="lg:col-span-1" />
    </div>
  </div>
</template>

2. VueUse Integration
Prioritize VueUse over native browser APIs.
<script setup lang="ts">
import { useClipboard, useDark, useToggle } from '@vueuse/core';
import { NButton, NCard } from 'naive-ui';
import { Icon } from '@iconify/vue';

const isDark = useDark();
const toggleDark = useToggle(isDark);
const { text, copy, copied } = useClipboard();

const handleCopy = () => copy('Hello Vue!');
</script>

<template>
  <n-card>
    <div class="flex items-center gap-2">
      <n-button @click="toggleDark()">
        <template #icon>
          <Icon icon="carbon:moon" v-if="isDark" />
          <Icon icon="carbon:sun" v-else />
        </template>
        Switch Theme
      </n-button>

      <n-button @click="handleCopy" :type="copied ? 'success' : 'default'">
        {{ copied ? 'Copied!' : 'Copy Text' }}
      </n-button>
    </div>
  </n-card>
</template>

3. Icon Usage (@iconify/vue)
Use the Component wrapper, not SVG strings.
<script setup lang="ts">
import { Icon } from '@iconify/vue';
</script>

<template>
  <Icon icon="mdi:account-circle" class="text-2xl text-primary" />

  <n-button>
    <template #icon>
      <Icon icon="ph:airplane-bold" />
    </template>
    Fly
  </n-button>
</template>
```

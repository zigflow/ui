/*
 * Copyright 2025 - 2026 Zigflow authors <https://github.com/zigflow/studio/graphs/contributors>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Shared context key and type for Canvas → FlowNode callback communication.
// Keeping callbacks out of node data ensures structuredClone can succeed on
// node objects, which silences SvelteFlow's "Use $state.raw for nodes" warning.

export const CANVAS_CALLBACKS_KEY = 'canvas-callbacks';

export type CanvasCallbacks = {
  onselect: (nodeId: string) => void;
  onenternode: (nodeId: string) => void;
  onenterbranch: (nodeId: string, branchId: string) => void;
};

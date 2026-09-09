/* global figma, __html__ */
import { assemble } from './engine'
figma.showUI(__html__, { width: 440, height: 580 })
let busy = false
figma.ui.onmessage = async message => {
  if (message.type !== 'assemble' || busy) return
  busy = true
  try {
    const report = await assemble(figma, message.job)
    figma.ui.postMessage({ type: 'report', report })
    if (!report.issues.length) {
      for (const [index, id] of report.createdNodeIds.entries()) {
        const node = await figma.getNodeByIdAsync(id)
        const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } })
        figma.ui.postMessage({ type: 'image', index, bytes })
      }
    }
  } catch (e) { figma.ui.postMessage({ type: 'error', message: e.message }) }
  finally { busy = false; figma.ui.postMessage({ type: 'done' }) }
}

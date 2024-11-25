import { ElementTypes, ErrorCodes, type NodeTransform, NodeTypes, createCompilerError } from '@vue/compiler-core'
import { pascalCase } from 'scule'

const hydrateTransform: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT && node.tagType === ElementTypes.COMPONENT) {
    node.tag = node.tag.replace(/^(Lazy|lazy-)(.*)/, (full: string, lazy: string, component: string) => {
      const hydrateProp = node.props.filter(prop =>
        (prop.type === NodeTypes.ATTRIBUTE && prop.name.startsWith('hydrate:'))
        || (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind'
          && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION && prop.arg.content.startsWith('hydrate')),
      )
      const lastProp = hydrateProp.pop()
      if (!lastProp) {
        return full // No hydration prop found
      }
      while (hydrateProp.length > 1) {
        context.onError(createCompilerError(ErrorCodes.DUPLICATE_ATTRIBUTES, hydrateProp.pop().nameLoc))
      }
      node.props = node.props.filter(prop => prop !== lastProp)
      const [, hydrateName] = lastProp.type === NodeTypes.DIRECTIVE
        ? lastProp.arg.content.split(':')
        : lastProp.name.split(':')

      return lazy + (lazy.endsWith('-') ? hydrateName + '-' : pascalCase(hydrateName)) + component
    })
  }
}
export default hydrateTransform

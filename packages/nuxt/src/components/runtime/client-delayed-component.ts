import {
  defineAsyncComponent,
  defineComponent,
  h,
  hydrateOnIdle,
  hydrateOnInteraction,
  hydrateOnMediaQuery,
  hydrateOnVisible,
  mergeProps,
  watch,
} from 'vue'
import type { AsyncComponentLoader, HydrationStrategy, PropType } from 'vue'

/* @__NO_SIDE_EFFECTS__ */

type HydrationStrategyFactory = <Hydrate>(props: { hydrate: Hydrate }) => HydrationStrategy | false
export const createLazyHydrationComponent = <Type extends Exclude<ReturnType<StrategyFactory>, false>, StrategyFactory extends HydrationStrategyFactory<Type>>
(strategyFactory: StrategyFactory, type: PropType<Type> = null, defaultValue: undefined | Type | (() => Type) = undefined) => {
  return (loader: AsyncComponentLoader) => defineComponent({
    inheritAttrs: false,
    props: {
      hydrate: {
        type,
        required: false,
        default: defaultValue,
      },
    },
    emits: ['hydrated'],
    setup (props, { attrs, emit }) {
      const hydrated = () => { emit('hydrated') }
      const strategy = strategyFactory(props)
      const comp = defineAsyncComponent(strategy ? { loader, hydrate: strategy } : loader)
      // TODO: fix hydration mismatches on Vue's side. The data-allow-mismatch is ideally a temporary solution due to Vue's SSR limitation with hydrated content.
      return () => h(comp, mergeProps(attrs, { 'data-allow-mismatch': '', 'onVnodeMounted': hydrated }))
    },
  })
}

export const createHydrateVisible =
  createLazyHydrationComponent(props => hydrateOnVisible(props.hydrate), Object)

/* @__NO_SIDE_EFFECTS__ */
export const createHydrateIdle =
  createLazyHydrationComponent(props => hydrateOnIdle(props.hydrate), Number)

/* @__NO_SIDE_EFFECTS__ */
export const createHydrateEvent =
  createLazyHydrationComponent(props => hydrateOnInteraction(props.hydrate), [String, Array], 'mouseover')

/* @__NO_SIDE_EFFECTS__ */
export const createHydrateMedia =
  createLazyHydrationComponent(props => hydrateOnMediaQuery(props.hydrate), String, '(min-width: 1px)')

const hydrateOnCondition: HydrationStrategyFactory<boolean> = (props) => {
  if (!props.hydrate) {
    return false
  }
  return ((hydrate) => {
    const unwatch = watch(() => props.hydrate, () => hydrate(), { once: true })
    return () => unwatch()
  }) as HydrationStrategy
}
/* @__NO_SIDE_EFFECTS__ */
export const createHydrateIf = createLazyHydrationComponent(hydrateOnCondition, Boolean, true)

const hydrateOnTime: HydrationStrategyFactory<number> = (props) => {
  if (props.hydrate <= 0) {
    return false
  }
  return ((hydrate) => {
    const id = setTimeout(hydrate, props.hydrate)
    return () => clearTimeout(id)
  }) as HydrationStrategy
}
/* @__NO_SIDE_EFFECTS__ */
export const createHydrateTime = createLazyHydrationComponent(hydrateOnTime, Number, 2000)

const hydrateOnPromise: HydrationStrategyFactory<Promise> = (props) => {
  if (!props.hydrate) {
    return false
  }
  return ((hydrate) => {
    props.hydrate!.then(hydrate)
  }) as HydrationStrategy
}
/* @__NO_SIDE_EFFECTS__ */
export const createHydratePromise = createLazyHydrationComponent(hydrateOnPromise, Promise)

/* @__NO_SIDE_EFFECTS__ */
export const createHydrateNever = (loader: AsyncComponentLoader) => defineAsyncComponent({ loader, hydrate: () => {} })

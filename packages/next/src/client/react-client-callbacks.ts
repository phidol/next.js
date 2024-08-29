import type { HydrationOptions } from 'react-dom/client'
import { isBailoutToCSRError } from '../shared/lib/lazy-dynamic/bailout-to-csr'
import { getReactStitchedError } from './components/react-dev-overlay/internal/helpers/stitched-error'

const reportGlobalError =
  typeof reportError === 'function'
    ? // In modern browsers, reportError will dispatch an error event,
      // emulating an uncaught JavaScript error.
      reportError
    : (error: any) => {
        window.console.error(error)
      }

export const onRecoverableError: HydrationOptions['onRecoverableError'] = (
  err,
  errorInfo
) => {
  const stitchedError = getReactStitchedError(err)
  // In development mode, pass along the component stack to the error
  if (process.env.NODE_ENV === 'development' && errorInfo.componentStack) {
    ;(stitchedError as any)._componentStack = errorInfo.componentStack
  }
  // Using default react onRecoverableError

  // Skip certain custom errors which are not expected to be reported on client
  if (isBailoutToCSRError(stitchedError)) return

  reportGlobalError(stitchedError)
}

export const onCaughtError: HydrationOptions['onCaughtError'] = (
  err,
  errorInfo
) => {
  const stitchedError = getReactStitchedError(err)

  if (process.env.NODE_ENV === 'development') {
    const errorBoundaryComponent = errorInfo?.errorBoundary?.constructor
    const errorBoundaryName =
      // read react component displayName
      (errorBoundaryComponent as any)?.displayName ||
      errorBoundaryComponent?.name ||
      'Unknown'

    const componentThatErroredFrame = errorInfo?.componentStack?.split('\n')[1]

    // Match chrome or safari stack trace
    const matches =
      componentThatErroredFrame?.match(/\s+at (\w+)\s+|(\w+)@/) ?? []
    const componentThatErroredName = matches[1] || matches[2] || 'Unknown'

    // In development mode, pass along the component stack to the error
    if (process.env.NODE_ENV === 'development' && errorInfo.componentStack) {
      ;(stitchedError as any)._componentStack = errorInfo.componentStack
    }

    // Modify the stack trace with errored component and error boundary, to match the behavior of default React onCaughtError handler.
    stitchedError.stack +=
      '\n\n' +
      `The above error occurred in the <${componentThatErroredName}> component. It was handled by the <${errorBoundaryName}> error boundary.`

    // Always log the modified error instance so the console.error interception side can pick it up easily without constructing an error again.
    console.error(stitchedError)
  } else {
    console.error(err)
  }
}

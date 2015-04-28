# FirefoxOS' WebAPIs navigator.connect based polyfill

## Why?

Again, this is a tricky question, because, again, it depends on what you mean by
why...

## Why a polyfill of the WebAPIs

TL;DR version: cause they're currently not being used enough.

*Long version:*

The current set of FirefoxOS specific WebAPIs seems to be going nowhere on a
standardization basis. That means, on a practical sense, that most web content
can't use it, and that the adoption of the new APIs (and thus, the development
of applications for FirefoxOS) is going slower than desired. So this is a way to
make those APIs available to everywhere on the web.

That will mean both a lower entry threshold since there will be no need for a
manifest, signing the packaged, using the marketplace, or whatever) and a
hopefully higher grow rate, and the development of more complex applications for
FirefoxOS that can also run, in some way, on the rest of the web and devices.

## Ok, you sold me that, but why navigator.connect of all things?

To implement this we need some kind of 'standardish' communication mechanism, to
be able to delegate work to other domains/applications (that will be the ones
that have actual access to the APIs). And navigator.connect is already out there
(it's implemented on Chrome at least) and we have a polyfill for FFOS (using
IAC, on https://github.com/mcjimenez/nav_connect ). Other than that, I don't
really mind about the actual communication mechanism used.

## What?

Well, as the title of this document says, this is or will be a polyfill library
offering some of the current WebAPIs available on FirefoxOS to privileged and
certified content (and even to content that has to have a manifest) to the rest
of the web without needing a manifest.

Now, I'm already lying to you. That's currently not true because to use IAC a
manifest is needed, and on an unmodified FFOS the app has to be certified. But
that's an artifact of the navigator.connect current polyfill implementation, and
not something implicit. In fact, we have a modified FFOS build where the
restriction of being a certified app is lifted from IAC that works without a
manifest on the client app (the service still requires a manifest though).

## How?

So as to no repeat myself, I refer you to the README.md on
https://github.com/mcjimenez/nav_connect.

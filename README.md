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
manifest on the client app (the mediator still requires a manifest though).

## How?

So as to no repeat myself, I refer you to the README.md on
https://github.com/mcjimenez/nav_connect.

## Security

This is the million dollar question. Restricted APIs are behind a permission
wall for two reasons:

1. They're not available everywhere.
2. They're dangerous to use (some more than other).

Now, the first reason goes away with an initiative like this one. Polyfilling
the APIs will make them available everywhere (where navigator.connect or some
other mechanism of cross-origin communication is available, that is). But the
second reason is still a valid concern.

To understand the way a proposed security model for the polyfilled APIs might
work, and why it's not more unsecure than the current security model (or the
proposed new security model), we're going to have to explain how the current
security model works. If you already know that, you can skip to the next
section.

### Current FFOS security model

On the current security model, the security model is based on controlling the
code. Only certified apps (applications that are preinstalled with the device)
and in a lesser extent privileged apps (applications that are signed by a
trusted marketplace, usually only Mozilla's own Firefox Marketplace) can have
access to privileged/certified APIs.

On the new security model, the distinction between privileged and certified APIs
goes away, and the only distinction is between signed apps (which potentially
have access to all the APIs) and unsigned apps (which have access only to what's
accessible to everything on the web).

So the both the current and the new proposed security model work on two main
maxims:

1. There's an strict control of the code (there are code reviews) and only the
code that has been reviewed and signed can access the APIs.
2. Once some code is granted access to an API the
access is *unrestricted*: For example an application that has access to the SMS
api can send any number of messages to any possible destination number without
any further control.

This works but it has two main risks:

1. The code review proccess is essential! Without a good code review we don't
really know what we're granting access to.
2. In case the app is compromised (and the signature validation doesn't catch
it, which might happen since signature is checked currently only at install
time, and for performance reasons I don't see that changing much) the now
compromised app can access *everything* the APIs it has without any restriction.

### Mediator security model

Mediators can, theoretically, have any security model, and theoretically no two
mediators have to even share the same model. Even so, all of them
have to work with what they know from the requests and those are:

1. The URL of the requestor.
2. The data passed on the actual request.

So, in practice, most if not all of the security models will be based around
those two properties. The security model we propose, though, is based on
controlling *who* can access the mediators and *what* they can do. That is,
mediators will have some kind of configuration that specify, per origin (or even
per URL) what data filters can be passed to specific functions.

Let's see this with an example. For this example, we will use the TCPSocket API
(https://developer.mozilla.org/en-US/docs/Web/API/TCP_Socket_API). A
configuration file for the TCPSocket API might look like:

```
{
  'https://a.provider.com/connect.html': {
    'open': {
       'throttle': {
         'maxPetitionsPerSecond': 2,
       },
       'params': {
         'host': '"another.domain.com"|"*.myownprovider.com'"',
         'port': '80|443',
         'options': {isSecure: true}
        }
     },
     'send': {
      'throttle': {
        'maxBytesPerSecond': 10240
      }
     },
  },
  'https://another.knownprovider.com/capi.html': {
    'open': {
       'throttle': {
         'maxPetitionsPerSecond': 20,
         'maxLifeTime': 120
       },
       'params': {
         'host': '"*.otherdomain.com"',
         'port': '443',
         'options': {isSecure: false}
        }
     },
     'send': {
      'throttle': {
        'maxBytesPerSecond': 102400
      }
     },
  }
}
```


On this example, we have defined that our mediator will allow:

* Controlling the URLs that can use it.
* Restricting the maximum number of times a method is called per second from a
  given URL.
* Restricting the maximum lifetime of an opened connection.
* Restricting the valid parameters that an open call might receive, so
  restricting to what servers and ports an origin URL can connect, and even if
  it must/can/cannot use SSL.
* Restricting the maximum number of bytes that it can be send by an opened
  connection.

And this is only an example. We could have more (or less restrictions) on a
actual TCPSocket mediator.


### Security model comparison.

At first glance it might look like the current security model, for third party
apps (note that this model is *not* proposed to replace the current OS level
apps!) is much more secure. After all, we're reviewing all the code of the apps,
and signing it to it cannot be modified after signing.

In practice, though, the code reviews are usually not very deep, and what they
basically get down to is to checking, for each privileged API that the app uses,
what it's used for. And to do that, the mediator security model is actually
*better* since it allows to explicitly define what the app writer has declared
the app needs to work, and a compromised app cannot do more than the app writer
originally requested (since the validation is done on every call, and not only
when the app was signed).

Basically, we're changing a deep-review/wide-access model for a shallow-review,
narrow-access model.

Now, not all the APIs are really suitable for this kind of control. TCPSocket
is, in fact, one of the easy ones. The APIs where there's a clear criteria to
narrow the access based on the actual API parameters (for example TCPSocket,
Settings, SystemXHR) are easy to move to this security model. On the other hand,
APIs where there's not a clear way to narrow the access based on the actual
parameters (at least currently) such as contacts or DeviceStorage are
harder. There's a (first draft) analysis of the current privileged permissions
at
https://docs.google.com/spreadsheets/d/1Ik048yBRN3aE31bg5ru1BDqFLssgIW8xTjugwnW6WLU/edit?usp=sharing 

### Configuration distribution

We've talked previously about a 'configuration' file that determines the
privilege/access level that web sites can have to the mediated APIs. But this
system wouldn't be of much use if that configuration file was an static file
distributed with the phone and never updated (or only updated when the actual
mediator code changes). The idea behind this configuration file is for it to be
alive. A possible option would be:

* Distribute an initial copy (with whatever it had defined at build time) with
  the phone.
* Check every X time (once per day, or by the user's request) if there's an
  update. Updates can be for the complete file, only for changes...). There's
  also the option of offering a service that gives the configuration for a given
  URL so the mediator only has to check for unknown URLs.
* Push changes to devices whenever a compromise is detected, we want to remove a
  previously authorized use.
* Allow the user (via settings, optionally) to fine tune the behavior (so he can
  define new rules, or remove rules).

Mozilla would be the responsible for keeping those mediator configuration files
up to date, and developers would have to contact Mozilla (Marketplace?) with
their needs. The process would be similar to the current process to get an
application privileged with two main differences:

* The developer has only to specify what APIs he needs and what's he going to use
  them for (and/or what parameters is he going to call them with) instead of
  submitting the whole code for his app.
* If the app code changes, so long as there's no API usage changes, there's no
  need to resubmit the app to get it signed.



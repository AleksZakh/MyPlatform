export default defineAppConfig({
  ui: {
    icons: {
      system: 'i-ph-desktop',
      light: 'i-ph-sun',
      dark: 'i-ph-moon'
    },
    tabs: {
      slots: {
        root: 'flex items-center gap-2',
        list: 'relative flex p-1 group',
        indicator: 'absolute transition-[translate,width] duration-200',
        trigger: [
          'group relative inline-flex items-center min-w-0 data-[state=inactive]:text-muted hover:data-[state=inactive]:not-disabled:text-default font-medium rounded-md disabled:cursor-not-allowed disabled:opacity-75',
          'transition-colors'
        ],
        leadingIcon: 'shrink-0',
        leadingAvatar: 'shrink-0',
        leadingAvatarSize: '',
        label: 'truncate',
        trailingBadge: 'shrink-0',
        trailingBadgeSize: 'sm',
        content: 'w-full rounded-md focus-visible:outline-3'
      },
      variants: {
        color: {
          primary: {
            content: 'outline-primary/25'
          },
          secondary: {
            content: 'outline-secondary/25'
          },
          success: {
            content: 'outline-success/25'
          },
          info: {
            content: 'outline-info/25'
          },
          warning: {
            content: 'outline-warning/25'
          },
          error: {
            content: 'outline-error/25'
          },
          neutral: {
            content: 'outline-inverted/25'
          },
          custom: {
            content: 'outline-orange/25'
          }
        },
        variant: {
          pill: {
            list: 'bg-elevated rounded-lg',
            trigger: [
              'grow',
              "in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:content-[''] in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:absolute in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:inset-0 in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:rounded-md in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:shadow-xs in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:-z-10 in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:isolate"
            ],
            indicator: 'rounded-md shadow-xs'
          },
          link: {
            list: 'border-default',
            indicator: 'rounded-full',
            trigger: "in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:content-[''] in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:absolute in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:rounded-full"
          }
        },
        orientation: {
          horizontal: {
            root: 'flex-col',
            list: 'w-full',
            indicator: 'left-0 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position)',
            trigger: 'justify-center'
          },
          vertical: {
            list: 'flex-col',
            indicator: 'top-0 h-(--reka-tabs-indicator-size) translate-y-(--reka-tabs-indicator-position)'
          }
        },
        size: {
          xs: {
            trigger: 'px-2 py-1 text-xs gap-1',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs'
          },
          sm: {
            trigger: 'px-2.5 py-1.5 text-xs gap-1.5',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs'
          },
          md: {
            trigger: 'px-3 py-1.5 text-sm gap-1.5',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs'
          },
          lg: {
            trigger: 'px-3 py-2 text-sm gap-2',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs'
          },
          xl: {
            trigger: 'px-3 py-2 text-base gap-2',
            leadingIcon: 'size-6',
            leadingAvatarSize: 'xs'
          }
        }
      },
      compoundVariants: [
        {
          orientation: 'horizontal',
          variant: 'pill',
          class: {
            indicator: 'inset-y-1'
          }
        },
        {
          orientation: 'horizontal',
          variant: 'link',
          class: {
            list: 'border-b -mb-px',
            indicator: '-bottom-px h-px',
            trigger: 'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:inset-x-0 in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:-bottom-[calc(var(--spacing)+1px)] in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:h-px'
          }
        },
        {
          orientation: 'vertical',
          variant: 'pill',
          class: {
            indicator: 'inset-x-1',
            list: 'items-center',
            trigger: 'w-full justify-center'
          }
        },
        {
          orientation: 'vertical',
          variant: 'link',
          class: {
            list: 'border-s -ms-px',
            indicator: '-start-px w-px',
            trigger: 'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:inset-y-0 in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:-start-[calc(var(--spacing)+1px)] in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:w-px'
          }
        },
        {
          color: 'primary',
          variant: 'pill',
          class: {
            indicator: 'bg-primary',
            trigger: [
              'data-[state=active]:text-inverted outline-primary/25 focus-visible:outline-3',
              'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:bg-primary'
            ]
          }
        },
        {
          color: 'neutral',
          variant: 'pill',
          class: {
            indicator: 'bg-inverted',
            trigger: [
              'data-[state=active]:text-inverted outline-inverted/25 focus-visible:outline-3',
              'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:bg-inverted'
            ]
          }
        },
        {
          color: 'primary',
          variant: 'link',
          class: {
            indicator: 'bg-primary',
            trigger: [
              'data-[state=active]:text-primary outline-primary/25 focus-visible:outline-3',
              'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:bg-primary'
            ]
          }
        },
        {
          color: 'neutral',
          variant: 'link',
          class: {
            indicator: 'bg-inverted',
            trigger: [
              'data-[state=active]:text-highlighted outline-inverted/25 focus-visible:outline-3',
              'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:bg-inverted'
            ]
          }
        },
        // Добавляем кастомный цвет для pill варианта
        {
          color: 'custom',
          variant: 'pill',
          class: {
            indicator: 'bg-orange-100',
            trigger: [
              'data-[state=active]:text-black',
              'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:bg-orange-100'
            ]
          }
        },
        // Добавляем кастомный цвет для link варианта
        {
          color: 'custom',
          variant: 'link',
          class: {
            indicator: 'bg-orange-100',
            trigger: [
              'data-[state=active]:text-orange-100',
              'in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:bg-orange-100'
            ]
          }
        }
      ],
      defaultVariants: {
        color: 'primary',
        variant: 'pill',
        size: 'md'
      }
    },
    input: {
      slots: {
        root: 'relative inline-flex items-center',
        base: [
          'w-full rounded-md border-0 appearance-none placeholder:text-dimmed disabled:cursor-not-allowed disabled:opacity-75',
          'transition-colors'
        ],
        leading: 'absolute inset-y-0 start-0 flex items-center',
        leadingIcon: 'shrink-0 text-dimmed',
        leadingAvatar: 'shrink-0',
        leadingAvatarSize: '',
        trailing: 'absolute inset-y-0 end-0 flex items-center',
        trailingIcon: 'shrink-0 text-dimmed'
      },
      variants: {
        fieldGroup: {
          horizontal: {
            root: 'group has-focus-visible:z-[1]',
            base: 'group-not-only:group-first:rounded-e-none group-not-only:group-last:rounded-s-none group-not-last:group-not-first:rounded-none'
          },
          vertical: {
            root: 'group has-focus-visible:z-[1]',
            base: 'group-not-only:group-first:rounded-b-none group-not-only:group-last:rounded-t-none group-not-last:group-not-first:rounded-none'
          }
        },
        size: {
          xs: {
            base: 'px-2 py-1 text-sm/4 gap-1',
            leading: 'ps-2',
            trailing: 'pe-2',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs',
            trailingIcon: 'size-4'
          },
          sm: {
            base: 'px-2.5 py-1.5 text-sm/4 gap-1.5',
            leading: 'ps-2.5',
            trailing: 'pe-2.5',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs',
            trailingIcon: 'size-4'
          },
          md: {
            base: 'px-2.5 py-2.5 text-base/5 gap-1.5',
            leading: 'ps-2.5',
            trailing: 'pe-2.5',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs',
            trailingIcon: 'size-5'
          },
          lg: {
            base: 'px-3 py-2 text-base/5 gap-2',
            leading: 'ps-3',
            trailing: 'pe-3',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs',
            trailingIcon: 'size-5'
          },
          xl: {
            base: 'px-3 py-2 text-base gap-2',
            leading: 'ps-3',
            trailing: 'pe-3',
            leadingIcon: 'size-6',
            leadingAvatarSize: 'xs',
            trailingIcon: 'size-6'
          }
        },
        variant: {
          outline: 'text-highlighted bg-default ring ring-inset ring-accented',
          soft: 'text-highlighted bg-elevated/50 hover:bg-elevated focus:bg-elevated disabled:bg-elevated/50',
          subtle: 'text-highlighted bg-elevated ring ring-inset ring-accented',
          ghost: 'text-highlighted bg-transparent hover:bg-elevated focus:bg-elevated disabled:bg-transparent dark:disabled:bg-transparent',
          none: 'text-highlighted bg-transparent focus:outline-none'
        },
        color: {
          primary: '',
          secondary: '',
          success: '',
          info: '',
          warning: '',
          error: '',
          neutral: ''
        },
        leading: {
          true: ''
        },
        trailing: {
          true: ''
        },
        loading: {
          true: ''
        },
        highlight: {
          true: ''
        },
        fixed: {
          false: ''
        },
        type: {
          file: 'file:me-1.5 file:font-medium file:text-muted file:outline-none'
        }
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: [
            'outline',
            'subtle'
          ],
          class: 'outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary'
        },
        {
          color: 'primary',
          variant: [
            'soft',
            'ghost'
          ],
          class: 'outline-primary/25 focus-visible:outline-3'
        },
        {
          color: 'primary',
          highlight: true,
          class: 'ring ring-inset ring-primary'
        },
        {
          color: 'neutral',
          variant: [
            'outline',
            'subtle'
          ],
          class: 'outline-inverted/25 focus-visible:outline-3 focus-visible:ring-inverted'
        },
        {
          color: 'neutral',
          variant: [
            'soft',
            'ghost'
          ],
          class: 'outline-inverted/25 focus-visible:outline-3'
        },
        {
          color: 'neutral',
          highlight: true,
          class: 'ring ring-inset ring-inverted'
        },
        {
          leading: true,
          size: 'xs',
          class: 'ps-7'
        },
        {
          leading: true,
          size: 'sm',
          class: 'ps-8'
        },
        {
          leading: true,
          size: 'md',
          class: 'ps-9'
        },
        {
          leading: true,
          size: 'lg',
          class: 'ps-10'
        },
        {
          leading: true,
          size: 'xl',
          class: 'ps-11'
        },
        {
          trailing: true,
          size: 'xs',
          class: 'pe-7'
        },
        {
          trailing: true,
          size: 'sm',
          class: 'pe-8'
        },
        {
          trailing: true,
          size: 'md',
          class: 'pe-9'
        },
        {
          trailing: true,
          size: 'lg',
          class: 'pe-10'
        },
        {
          trailing: true,
          size: 'xl',
          class: 'pe-11'
        },
        {
          loading: true,
          leading: true,
          class: {
            leadingIcon: 'animate-spin'
          }
        },
        {
          loading: true,
          leading: false,
          trailing: true,
          class: {
            trailingIcon: 'animate-spin'
          }
        },
        {
          fixed: false,
          size: 'xs',
          class: 'md:text-xs'
        },
        {
          fixed: false,
          size: 'sm',
          class: 'md:text-xs'
        },
        {
          fixed: false,
          size: 'md',
          class: 'md:text-sm'
        },
        {
          fixed: false,
          size: 'lg',
          class: 'md:text-sm'
        }
      ],
      defaultVariants: {
        size: 'md',
        color: 'neutral',
        variant: 'outline'
      }
    },
    button: {
      slots: {
        base: [
          'rounded-md font-medium inline-flex items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75',
          'transition-colors'
        ],
        label: 'truncate',
        leadingIcon: 'shrink-0',
        leadingAvatar: 'shrink-0',
        leadingAvatarSize: '',
        trailingIcon: 'shrink-0'
      },
      variants: {
        fieldGroup: {
          horizontal: 'not-only:first:rounded-e-none not-only:last:rounded-s-none not-last:not-first:rounded-none focus-visible:z-[1]',
          vertical: 'not-only:first:rounded-b-none not-only:last:rounded-t-none not-last:not-first:rounded-none focus-visible:z-[1]'
        },
        color: {
          primary: '',
          secondary: '',
          success: '',
          info: '',
          warning: '',
          error: '',
          neutral: ''
        },
        variant: {
          solid: '',
          outline: '',
          soft: '',
          subtle: '',
          ghost: '',
          link: ''
        },
        size: {
          xs: {
            base: 'px-2 py-1 text-xs gap-1',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs',
            trailingIcon: 'size-4'
          },
          sm: {
            base: 'px-2.5 py-1.5 text-xs gap-1.5',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs',
            trailingIcon: 'size-4'
          },
          md: {
            base: 'px-2.5 py-1.5 text-sm gap-1.5',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs',
            trailingIcon: 'size-5'
          },
          lg: {
            base: 'px-3 py-2 text-sm gap-2',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs',
            trailingIcon: 'size-5'
          },
          xl: {
            base: 'px-3 py-2 text-base gap-2',
            leadingIcon: 'size-6',
            leadingAvatarSize: 'xs',
            trailingIcon: 'size-6'
          }
        },
        block: {
          true: {
            base: 'w-full justify-center',
            trailingIcon: 'ms-auto'
          }
        },
        square: {
          true: ''
        },
        leading: {
          true: ''
        },
        trailing: {
          true: ''
        },
        loading: {
          true: ''
        },
        active: {
          true: {
            base: ''
          },
          false: {
            base: ''
          }
        }
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: 'text-inverted bg-primary hover:bg-primary/75 active:bg-primary/75 disabled:bg-primary aria-disabled:bg-primary outline-primary/25 focus-visible:outline-3'
        },
        {
          color: 'primary',
          variant: 'outline',
          class: 'ring ring-inset ring-primary/50 text-primary hover:bg-primary/10 active:bg-primary/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary'
        },
        {
          color: 'primary',
          variant: 'soft',
          class: 'text-primary bg-primary/10 hover:bg-primary/15 active:bg-primary/15 outline-primary/25 focus-visible:outline-3 disabled:bg-primary/10 aria-disabled:bg-primary/10'
        },
        {
          color: 'primary',
          variant: 'subtle',
          class: 'text-primary ring ring-inset ring-primary/25 bg-primary/10 hover:bg-primary/15 active:bg-primary/15 disabled:bg-primary/10 aria-disabled:bg-primary/10 outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary'
        },
        {
          color: 'primary',
          variant: 'ghost',
          class: 'text-primary hover:bg-primary/10 active:bg-primary/10 outline-primary/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent'
        },
        {
          color: 'primary',
          variant: 'link',
          class: 'text-primary hover:text-primary/75 active:text-primary/75 disabled:text-primary aria-disabled:text-primary outline-primary/25 focus-visible:outline-3'
        },
        {
          color: 'neutral',
          variant: 'solid',
          class: 'text-inverted bg-inverted hover:bg-inverted/90 active:bg-inverted/90 disabled:bg-inverted aria-disabled:bg-inverted outline-inverted/25 focus-visible:outline-3'
        },
        {
          color: 'neutral',
          variant: 'outline',
          class: 'ring ring-inset ring-accented text-default bg-default hover:bg-elevated active:bg-elevated disabled:bg-default aria-disabled:bg-default outline-inverted/25 focus-visible:outline-3 focus-visible:ring-inverted'
        },
        {
          color: 'neutral',
          variant: 'soft',
          class: 'text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 outline-inverted/25 focus-visible:outline-3 disabled:bg-elevated aria-disabled:bg-elevated'
        },
        {
          color: 'neutral',
          variant: 'subtle',
          class: 'ring ring-inset ring-accented text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 disabled:bg-elevated aria-disabled:bg-elevated outline-inverted/25 focus-visible:outline-3 focus-visible:ring-inverted'
        },
        {
          color: 'neutral',
          variant: 'ghost',
          class: 'text-default hover:bg-elevated active:bg-elevated outline-inverted/25 focus-visible:outline-3 hover:disabled:bg-transparent dark:hover:disabled:bg-transparent hover:aria-disabled:bg-transparent dark:hover:aria-disabled:bg-transparent'
        },
        {
          color: 'neutral',
          variant: 'link',
          class: 'text-muted hover:text-default active:text-default disabled:text-muted aria-disabled:text-muted outline-inverted/25 focus-visible:outline-3'
        },
        {
          size: 'xs',
          square: true,
          class: 'p-1'
        },
        {
          size: 'sm',
          square: true,
          class: 'p-1.5'
        },
        {
          size: 'md',
          square: true,
          class: 'p-1.5'
        },
        {
          size: 'lg',
          square: true,
          class: 'p-2'
        },
        {
          size: 'xl',
          square: true,
          class: 'p-2'
        },
        {
          loading: true,
          leading: true,
          class: {
            leadingIcon: 'animate-spin'
          }
        },
        {
          loading: true,
          leading: false,
          trailing: true,
          class: {
            trailingIcon: 'animate-spin'
          }
        }
      ],
      defaultVariants: {
        color: 'primary',
        variant: 'solid',
        size: 'md'
      }
    }
  }
})
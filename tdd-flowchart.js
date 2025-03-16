                // Completion Phase - Direct sequential connections
                { from: 'step-27', to: 'doc-active-context', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-27', to: 'step-28', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-28', to: 'doc-feature-registry', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-28', to: 'step-29', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-29', to: 'step-30', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-30', to: 'step-1', label: 'Restart process', connectionClass: 'step-connection' },
                
                // Document relationships 
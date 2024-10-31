// Define a WPRequiredTaxonomiesValidation object with data and methods for validating taxonomies
const WPRequiredTaxonomiesValidation = {
	// Data object containing required taxonomies and error message
	data: vgrt_data,

	// Initialize the validation by attaching event handlers to relevant elements
	initialize() {
		jQuery(window).on('load', () => {
			this.handleLoad();
		});
	},

	// Handle load event by setting up click event listeners for publish button and related toggles
	handleLoad(event) {
		window.$ = jQuery;
		this.taxonomies = this.data.required_taxonomies;

		if ($('.block-editor').length) {
			this.validateTaxonomiesOnBlockEditor();
		} else {
			$('#publish').click((event) => {this.validateTaxonomies(event)});
		}
	},

	getTaxonomiesMissingTerms() {
		const postEdits = wp.data.select('core/editor').getPostEdits();
		const originalPost = wp.data.select('core/editor').getCurrentPost();
		let lockedTaxonomies = [];

		// Iterate over each required taxonomy and check if it has values
		for (const taxonomy in this.taxonomies) {
			const label = this.taxonomies[taxonomy].label;
			const taxonomy_key = this.taxonomies[taxonomy].rest_base || this.taxonomies[taxonomy].tx;

			// Skip if the taxonomy is not found in the post object
			if (typeof postEdits[taxonomy_key] === 'undefined' && typeof originalPost[taxonomy_key] === 'undefined') {
				continue;
			}

			const taxonomyValues = postEdits[taxonomy_key] ? postEdits[taxonomy_key] : originalPost[taxonomy_key];
			if ((Array.isArray(taxonomyValues) && taxonomyValues.length) || (typeof taxonomyValues === 'string' && taxonomyValues)) {
				continue;
			}

			if ((Array.isArray(taxonomyValues) && taxonomyValues.length) || (typeof taxonomyValues === 'string' && taxonomyValues)) {
				continue;
			}

			lockedTaxonomies.push(label);
		}
		return lockedTaxonomies;
	},
	validateTaxonomiesOnBlockEditor() {
		const {
			plugins: {
				registerPlugin,
			},
			element: {
				useEffect,
			},
			data: {
				useSelect,
				useDispatch,
			},
		} = wp;

		let currentNotices = [];

		function wpRequiredTaxonomiesCheck() {
			const lockedTaxonomies = useSelect((select) => WPRequiredTaxonomiesValidation.getTaxonomiesMissingTerms(), []);

			const { lockPostSaving, unlockPostSaving } = useDispatch('core/editor');
			const { createWarningNotice, removeNotice } = useDispatch('core/notices');
			useEffect(() => {
				if (lockedTaxonomies.length) {
					lockPostSaving('wpRequiredTaxonomiesLock');
					lockedTaxonomies.forEach((label) => {
						createWarningNotice(
							WPRequiredTaxonomiesValidation.data.error_message.replace('{taxonomy_name}', label),
							{ id: 'wpRequiredTaxonomiesLock' + label, isDismissible: true },
						);
						currentNotices.push('wpRequiredTaxonomiesLock' + label);
					})
				}

				return () => {
					unlockPostSaving('wpRequiredTaxonomiesLock');
					currentNotices.forEach((id) => {
						removeNotice(id);
					});
				};
			}, [lockedTaxonomies]);

			return null;
		}

		registerPlugin('wp-required-taxonomies-check', { render: wpRequiredTaxonomiesCheck });
	},

	// Prevent default action and validate taxonomies when the publish button is clicked
	validateTaxonomies(event) {
		let allowed = true;

		// Iterate over each required taxonomy and check if it has values
		for (const taxonomy in this.taxonomies) {
			const label = this.taxonomies[taxonomy].label;
			const tx = taxonomy;
			let $scope;
			let hasValues;

			// If the taxonomy is a WooCommerce global attribute, check if its metabox is visible and has values
			if (tx.indexOf('pa_') > -1) {
				$scope = $('.wc-metabox.' + tx).first();
				if (!$scope.length) {
					alert(this.data.error_message.replace('{taxonomy_name}', label));
					allowed = false;
				}
			} else {
				// If the taxonomy metabox is not visible, skip validation for this taxonomy
				$scope = $('#' + tx + 'div, .components-panel__body-toggle:contains(' + label + '), #tagsdiv-' + tx + ', .wc-metabox.' + tx).first();
				if (!$scope.length) {
					return;
				}
			}

			// If the taxonomy is a WooCommerce global attribute, check for values in its metabox
			if (tx.indexOf('pa_') > -1) {
				hasValues = $scope.find('.attribute_values').val();
			} else {
				hasValues = $scope.find('input:checked').length > 0 || $scope.find('textarea').val();
			}

			// If the taxonomy does not have values, show an error message and set allowed to false
			if (!hasValues) {
				alert(this.data.error_message.replace('{taxonomy_name}', label));
				allowed = false;
			}
		}

		// Return true if all taxonomies have values, otherwise return false to prevent publishing
		if (!allowed) {
			event.preventDefault();
		}
		return allowed;
	},

};

// Initialize the validation process
WPRequiredTaxonomiesValidation.initialize();
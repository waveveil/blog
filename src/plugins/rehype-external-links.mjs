import { visit } from "unist-util-visit";

function isExternalLink(href, site) {
	if (typeof href !== "string" || href.length === 0) {
		return false;
	}

	if (
		href.startsWith("#") ||
		href.startsWith("/") ||
		href.startsWith("./") ||
		href.startsWith("../")
	) {
		return false;
	}

	if (href.startsWith("//")) {
		return true;
	}

	if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href)) {
		return false;
	}

	if (href.startsWith("mailto:") || href.startsWith("tel:")) {
		return false;
	}

	try {
		const url = new URL(href, site);
		const siteUrl = new URL(site);
		return url.origin !== siteUrl.origin;
	} catch {
		return false;
	}
}

function mergeRel(existingRel) {
	const relValues = new Set(
		Array.isArray(existingRel)
			? existingRel
			: typeof existingRel === "string"
				? existingRel.split(/\s+/)
				: [],
	);

	relValues.add("noopener");
	relValues.add("noreferrer");

	return [...relValues].filter(Boolean).join(" ");
}

export function rehypeExternalLinks({ site }) {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (node.tagName !== "a") {
				return;
			}

			const href = node.properties?.href;
			if (!isExternalLink(href, site)) {
				return;
			}

			node.properties = {
				...node.properties,
				target: "_blank",
				rel: mergeRel(node.properties?.rel),
			};
		});
	};
}
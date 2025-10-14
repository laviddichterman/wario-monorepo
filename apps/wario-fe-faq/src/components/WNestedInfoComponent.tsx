import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Tab, Typography } from '@mui/material';
import { TabList, TabPanel, TabContext } from '@mui/lab'

interface InfoSection {
  menutitle: string, // just the title
  title?: string, // dunno
  type?: "list" | "tabs", // type of section, list is a simple list, tabs is a tabbed interface
  content?: ReactNode, // optional explanation of this section
  subsections: InfoSection[] // subcontent for this section
};

const NestedInfoData: InfoSection = {
  menutitle: "Frequently Asked Questions",
  subsections: [
    // {
    //   menutitle: "About us",
    //   subsections: [
    //     {
    //       menutitle: "Who are we?",
    //       subsections: [],
    //       content: (<div>
    //         <Typography variant="h6">Windy City Pie</Typography>
    //         <Typography variant="body1">We are a Seattle-based pizza company specializing in Chicago-style deep-dish and tavern-style thin-crust pizzas. We also offer a hybrid Chicago/Detroit pan pizza. Our pizzas are made with a long-ferment sourdough crust, a blend of Wisconsin Brick Cheese and Mozzarella, and a variety of toppings. We are not affiliated with any other pizza company with a similar name.</Typography>
    //       </div>),
    //     }
    //   ]
    // },
    {
      menutitle: "Our pizza",
      subsections: [
        {
          menutitle: "What style(s) of pizza do you make?",

          subsections: [],
          content: (
            <div>We make three different kinds of pizzas! Below is a list of those styles along with some of the pizzerias that influenced our recipes. None of our pizzas are exact clones of other restaurants but they’re meant to scratch the itch for nostalgia while being delicious in their own right
              <ul>
                <li><Typography variant="h6">Windy City Pie Chicago-Style Deep-Pan Deep-Dish Pizza</Typography>Our deep pan pizzas are inspired by the enriched, spongier, sweeter crust of Papa Del's (in Champaign/Urbana) and the Maillard browned (often confused for caramelized) cheese edge and balance of Burt Katz's Pequod's and Burt's Place.</li>
                <li><Typography variant="h6">Windy City Pie Chicago-Style Thin-Crust (aka Tavern-style) Pizza</Typography>Our tavern-style thin crust pizzas take inspiration from the dough 'curing' technique pioneered by Pat's Pizza and then perfected by Kim's Uncle in Westmont while holding a lot of admiration for the pizzas at Vito &amp; Nick's.</li>
                <li><Typography variant="h6">Breezy Town Pizza Hybrid Chicago/Detroit Pan Pizza</Typography>This is inspired by a 2017 visit to Paulie Gee's in Logan Square and realizing how similar Chicago and Detroit pan pizzas are to one another. Our version of this style uses a long-ferment sourdough crust and a blend of Wisconsin Brick Cheese and Mozzarella. Compared to our other deep=dish offering, this pie has less sauce and the toppings are layered differently. . It's round, unlike Detroit-style pizza, because we didn't want to buy new pans. It's not trying to be authentic to any known style.</li>
              </ul>
            </div>),
        },
        {
          menutitle: "Is your deep-dish pizza like Lou’s or Giordano’s?",
          subsections: [],
          content: (<div>There are many styles of deep-dish pizzas, and we do not take our inspiration from either of those well-known Chicago deep-dish pizzerias. Lou’s makes the most well-known style, which we refer to as classic Chicago deep-dish. Giordano’s makes a style called stuffed deep-dish with a layer of dough above the cheese and toppings. We make a third style, called deep-pan deep-dish which has a crispy cheese edge and is less heavy, while still being plenty decadent, compared to the other two styles.</div>),
        },
        {
          menutitle: "Is your Chicago-style deep-dish pizza \"authentic\"?",
          subsections: [],
          content: (<div>We think so. Whether or not they’re authentic for you can only be decided by you and is probably determined by which Chicago neighborhood you grew up in (or where you most often visited) and which style of pizza you’re craving today. In other words, if you’re looking for a Pequod’s style deep-pan deep-dish pizza, we think you’ll find ours very familiar and likely quite authentic. If you’re looking for something more akin to Uno’s/Due’s, Lou Malnati’s, or Giordano’s, then you’ll find our pizzas to be different, but hopefully delicious in their own right.</div>),
        },
        {
          menutitle: "What vegan pizza options do you have?",
          subsections: [],
          content: (<div>Our tavern style pizzas and the Breezy Town Chicago/Detroit hybrid pizzas can be made vegan! Our Windy City Pie Chicago-style deep-pan pizzas cannot be made vegan.</div>),
        },
        {
          menutitle: "Do you have gluten-free pizza?",
          subsections: [],
          content: (<div>We do not. We wish we could, but with the constraints of our operation, we can’t reliably offer a true gluten-free pizza.</div>),
        },
        {
          menutitle: "How long does your pizza take to cook?",
          subsections: [],
          content: (<div>Our deep dish pizzas take roughly 35 minutes to make. Our thin crust pizzas take roughly 12 minutes to make. Depending on how many other pizzas we have on order at a given time, it might take longer for your pizzas to be ready. This is one of the many reasons we highly suggest pre-ordering pizzas for pick-up AND for dine-in!</div>),
        },
        {
          menutitle: "Help! The website isn’t letting me do my desired custom pizza!",
          subsections: [],
          content: (<div>Our online ordering system has built in smarts to ensure you get a delicious pizza. If you’re not able to add a particular topping to a pizza, there’s probably a reason. If you hover your mouse over a topping that appears to be disabled, the website will tell you why you’re not able to add it.</div>),
        },
        {
          menutitle: "I'm not seeing half toppings on the menu, can you make split pizzas?",
          subsections: [],
          content: (<div>We always want to oblige requests as much as we’re able and as long as the end result will consistently be delicious. If looking to build a split pizza, we suggest omitting a single topping from one side of the pizza. It’s always best to start from a place of common enjoyment!</div>),
        },
        {
          menutitle: "I really, really want a split pizza. How do I order it and what are the rules?",
          subsections: [],
          content: (<div>
            <ul>
              <li>When ordering a split pizza, make sure you've added all the toppings to the pizza. Half toppings are charged at full price and omitting a topping will delay your order.</li>
              <li>In the special instructions, identify the pizza you want to split and specify the toppings you'd like on the whole pizza, and which ones you'd like on each side. For a convenient short-hand, use <strong>L:</strong> and <strong>R:</strong> to specify left and right side toppings respectively.<br />For example, if you want a Meatza with Hot Giardiniera on the left side and no Hot Giardiniera on the right side, you would write: Meatza L: Hot Giardiniera.</li>
              <li>We don’t split meatballs or roasted garlic.</li>
              <li>We don’t split sauces or amount/type of cheese (e.g. half red sauce, half white sauce, or half mozzarella, half vegan cheese blend or half mozzarella, half extra mozzarella).</li>
              <li>We don’t offer more than four total half toppings per pizza, and the difference in number of toppings per side cannot be more than two.</li>
            </ul>
          </div>),
        },
        {
          menutitle: "When I try to make a substitution, it changes to a build-your-own pizza. Why is that?",
          subsections: [],
          content: (<div>
            Once you start removing things from a menu pizza, the pizza is no longer one of our specialty pizzas. Our speciality pizzas are pre-set combinations that we find delicious but they are still priced like an a la carte pizza. So as you make modifications to the pizza and it becomes a build-your-own-pie or becomes a different menu pizza, the ordering interface will show you that in real time. No matter what you order, you're only ever paying for the toppings you're getting.
            <br />As an example, if you start customizing a Meatza (Red Sauce + Mozzarella + Baked-In Pepperoni + House Sausage + Candied Bacon) and you remove the Baked-In Pepperoni, it will show as a build-your own pizza with House Sausage + Candied Bacon. If you then add Pineapple and Hot Giardiniera, it will show a Sweet Pete.</div>),
        },
        // {
        //   menutitle: "The Chicago Pizza Landscape, according to us",
        //   subsections: [],
        //   content: (<div>Chicago Pizza taxonomy is a touchy subject and your classification of pizza styles and pizza in general might differ from ours. Here's our interpretation of the Chicago-style landscape with examples of restaurants that make them:
        //     <ul>
        //       <li>Deep-Dish
        //         <ul>
        //           <li>Traditional (e.g. Lou Malnati's, My Pi, Pizzeria Uno, Pizzeria Due, Gino's East, Pizano's, Bartoli's Pizzeria)</li>
        //           <li>Deep Pan (e.g. Pequod's, Burt's Place, Labriola Chicago, Milly's Pizza In The Pan, George's Deep-Dish)</li>
        //           <li>Stuffed (e.g. Giordano's, The Art of Pizza, Bacino’s, Edwardo’s, Nancy's)</li>
        //         </ul>
        //       </li>
        //       <li>Thin Crust (aka Tavern-Style)
        //         <ul>
        //           <li>Traditional (e.g. Vito &amp; Nick's, Phil's Pizza, Candelite, Marie's Pizza &amp; Liquors)</li>
        //           <li>'Cured' (e.g. Pat's Pizza, Kim's Uncle, Crust Fund Pizza)</li>
        //           <li>Pastry (e.g. Barnaby's, Home Run Inn)</li>
        //         </ul>
        //       </li>
        //       <li>Pizza Puffs</li>
        //     </ul>
        //     Yes, Pizza Puffs were invented in Chicago and no we're not influenced by them.</div>),
        // },
        {
          menutitle: "Do you slice the pizza for takeout?",
          subsections: [],
          content: (<div>This depends on the pizza style.
            <ul>
              <li>We automatically slice our thin crust pizzas into squares. </li>
              <li>We never pre-slice the Chicago-style deep-dish pizzas. Yes, it sounds silly, but it's a hill we die on. The pizza is far too saucy to stand-up to any amount of travel pre-sliced. Please plan accordingly and slice one slice at a time when you're enjoying the pizza.</li>
              <li>While we don't recommend doing so, we will slice the Breezy Town pizzas into 6 slices upon request.</li>
            </ul>
          </div>),
        },
      ]
    },
    {
      menutitle: "Ordering, Dining In, and Reservations",
      subsections: [
        {
          menutitle: "Do I need a reservation?",
          subsections: [],
          content: (<div>While not strictly necessary, we always recommend it, especially when there is an event at the Woodland Park Zoo. Your dining reservation is the same thing as pre-ordering a pizza for dine-in. We recommend you pre-order your pizza since it is the only way to guarantee seating and that your food will come out at the time you want. We keep limited bar seating available for walk-up guests even when we are full with reservations.
          </div>),
        },
        {
          menutitle: "Why can’t I make a reservation without ordering the food ahead of time?",
          subsections: [],
          content: (<div>We are able to provide the best experience for our patrons when dine-in orders are pre-selected and the kitchen can get started on it before you arrive. In Chicago, at a busy deep-dish restaurant, you can often spend over an hour just waiting for your food. That’s not an experience we think Seattle restaurantgoers are looking for so we have designed a reservation system that encourages you to pre-order your deep dish pizza.
          </div>),
        },
        {
          menutitle: "How does the timing work for a reservation?",
          subsections: [],
          content: (<div>Your reservation begins promptly at the time you’ve selected online. We give you approximately 15 minutes to get situated, enjoy any pre-ordered small plates, and order beverages. Your pizzas will arrive at your table about 15 minutes after your reservation time. While we rarely enforce it, we reserve the right to limit dining time to 75 minutes from the start of a reservation.
          </div>),
        },
        {
          menutitle: "Should I order all of the food with my pre-order?",
          subsections: [],
          content: (<div>Yes, we highly suggest that you make the full food order as part of your pre-order, especially if you’re joining us during the dinner rush, on a weekend, or close to our closing time. Knowing what we’re preparing for your party helps us with timing and coursing of the food. That said, we’re more than happy to take orders for additional food after you’ve arrived. Our small plates are very quick to make so we will make them fresh for you when you sit down, even if you pre-order them.</div>),
        },
        {
          menutitle: "What if I want different coursing, or have some other special request?",
          subsections: [],
          content: (<div>For any special instructions, you can write them as comments in the order form and also text us at <a href="sms:+12064864743">206.486.4743</a>. We will do our best to accommodate your request!</div>),
        },
        {
          menutitle: "What if I want to have a party that lasts longer than 75 minutes? What if I want to have a private/semi-private event?",
          subsections: [],
          content: (<div>We'd love to help host a special event or larger party at our restaurant. Send us an <a href="mailto:eatpie@windycitypie.com">email</a> to coordinate. If it's a large gathering that might interfere with normal business operations, we might set a minimum spend for your party.</div>),
        },
        {
          menutitle: "If we’re a large party, how do we best order and pay separately for our food but still sit together?",
          subsections: [],
          content: (<div>Great question! Please make individual orders on our website. Include a party name and the total number of guests for all groups in the special instructions. Please make the reservation for the number of people in your part of the party.
          </div>),
        },
        {
          menutitle: "Can I get an uncooked or par-baked pizza?",
          subsections: [],
          content: (<div>We don’t offer this due to the constraints of our kitchen and recipe. You can get a fully cooked, frozen pizza! See the next question!</div>),
        },
        {
          menutitle: "Do you ship pizza?",
          subsections: [],
          content: (<div>No, however our founder has brought frozen pizza on a plane to his parents with only minimal concern from TSA. If you would like to bring your pizza long distance please text or email us to order a fully baked and frozen pizza. We ask for 24 hours notice on a frozen pizza.</div>),
        },
        {
          menutitle: "Do you deliver pizza?",
          subsections: [],
          content: (<div>Generally, no. If you have a large gathering and plenty of notice, then reach out to us via <a href="mailto:eatpie@windycitypie.com">email</a>.</div>),
        },
        {
          menutitle: "Can you accommodate my dietary restrictions?",
          subsections: [],
          content: (<div>We will always do our best to accommodate dietary restrictions as we’re able. Guests should keep in mind that, while we will take measures to reduce the likelihood of cross contamination, we cannot guarantee that the items we serve do not contain any specific allergen.<br />If you have a dietary restriction, please inform your server or, if ordering ahead, in the special instructions in your online order.</div>),
        },
        {
          menutitle: "When is the last call for pizza and drinks?",
          subsections: [],
          content: (<div>The kitchen takes its last pizza order 35 minutes before we close. We serve small plates and beverages up until 15 minutes before close. Out of respect for our team, we ask all patrons be on their way no later than 30 minutes after close.</div>),
        },
      ]
    },
    {
      menutitle: "Pizza Reheating Instructions",
      type: "list",
      subsections: [
        {
          menutitle: "Deep-Dish Pizza Reheating",
          // content: `ByLorem ipsunsamdsdkjnadkjsdancsdkajn`,
          subsections: [
            {
              menutitle: "By the slice",
              content: (<div>The idea with this method is that since the pizza is rather dense, it’s hard, if not impossible, to heat a slice up via convection or conduction alone. Our deep-dish pizzas are best when hot, and kick-starting the process with the microwave will get the center hot so an oven can finish the job.
                <ul>
                  <li>Pre-heat an oven or toaster oven to 400F.</li>
                  <li>Cut one slice (1/8th of a pizza for a Windy deep-dish, or 1/6th of a pizza for a Breezy pizza)</li>
                  <li>Microwave that single slice for roughly 1 minute.</li>
                  <li>Place the microwaved slice in the pre-heated oven for 5 minutes.</li>
                  <li>Enjoy!</li>
                </ul>
                There’s a lot more to say about the science behind this, so we’ll refer you to an <a href="https://www.instagram.com/p/CbdVnVPvTzy/">instagram post</a> we made about this very topic a few years ago!
              </div>),
              subsections: []
            },
            // {
            //   menutitle: "As a whole pizza",
            //   content: (<div>The plan is to slowly heat the pizza while it’s covered in something that will prevent the pizza itself from drying out. Because the pizza is very dense, this will take a while. The assumption is that the pizza being reheated is roughly 45F at the start of this process. If the pizza is frozen, it needs to be thawed ahead of time which might take up to two days in a refrigerator.
            //     <ul>
            //       <li>Cover the top of the pizza in aluminum foil.</li>
            //       <li>Preheat the oven to 225F and leave the convection fan off.</li>
            //       <li>Place the wrapped pizza in the oven on a metal tray and let it heat up.</li>
            //       <li>Check the pizza is appropriately hot enough after 20 minutes, then every 10 minutes. Use an instant read thermometer to verify the internal temperature of the pizza reaches and maintains at least 140F for 5 minutes.</li>
            //       <li>Increase the oven temperature to 450F and let the pizza crisp up for 5 minutes as the temperature rises in the oven.</li>
            //       <li>Enjoy!</li>
            //     </ul>
            //   </div>),
            //   subsections: []
            // }
          ]
        },
        {
          menutitle: "Thin Crust (Tavern) Pizza Reheating",
          // content: `ByLorem ipsunsamdsdkjnadkjsdancsdkajn`,
          subsections: [
            {
              menutitle: "Slices or whole pizza",
              content: (<div>The amount you can reheat here depends on the size of the skillet you have. For best results, the skillet does need to be covered otherwise the top of the pizza will dry out and it will take longer to reheat!
                <ul>
                  <li>Pre-heat a pan on medium heat. Do not add any oil. (Most pan materials will work just fine, but carbon steel and cast-iron have worked quite well for us in our tests. Make sure you have a lid.)</li>
                  <li>Place pizza in the pan.</li>
                  <li>Cover the pan and cook for at least 7 minutes.</li>
                  <li>Check the bottom of the pizza is crispy and the cheese on top is starting to melt.</li>
                  <li>Enjoy!</li>
                </ul>
              </div>),
              subsections: []
            }
          ]
        },
      ]
    },
    {
      menutitle: "Everything Else!",
      // content: `Lorem ipsunsamdsdkjnadkjsdancsdkajn`,
      subsections: [
        {
          menutitle: "How can I contact you?",
          subsections: [],
          content: (<div>You may reach out by text at <a href="sms:+12064864743">206.486.4743</a> or by email at <a href="mailto:eatpie@windycitypie.com">eatpie@windycitypie.com</a>. While we don't have a number you can call, text messaging and emails allow us to be very responsive to your inquiries even during a busy service.</div>),
        },
        {
          menutitle: "What if I have an issue with my order?",
          subsections: [],
          content: (<div>If there is ever an issue with your order, please let us know as soon as possible so we can make it right! We do our best to make a consistent and delicious product but mistakes can and do happen. You can reach out to us from home with your concern or let us know in person if you’re dining in.
          </div>),
        },
        {
          menutitle: "Dogs?",
          subsections: [],
          content: (<div>Ya like dags? We love dogs! Pets at our outdoor patio are absolutely welcome, but we cannot have pets inside the restaurant. King County’s health code prohibits pets from being inside a food service establishment. Service animals assisting differently abled guests are not subject to this rule. We are not able to allow emotional support animals inside our restaurant due to the King County Health code.</div>),
        },
        {
          menutitle: "It looks like you got rid of tipping?",
          subsections: [],
          content: (<div>The restaurant industry in Seattle and across the country is figuring out how to equitably pay hardworking staff and source ingredients that are getting more expensive (just like your grocery bills have increased). We decided to raise our prices and eliminate the expectation of tipping or application of service fees in January 2025. This means you get to see the real cost of our food directly on the menu and don’t receive unexpected fees when you’re paying your bill. The shifts around tipping, service fees, and what constitutes a fair wage over the past few years have been a journey for us and the entire restaurant industry. We hope that we’ve landed on a solution that our guests find refreshing while ensuring our staff are well compensated! We are happy to expand on this answer if it turns out our customers want more information on this topic.</div>),
        },
      ]
    },
  ]
}

function ListInfoSection({ data }: { data: InfoSection }) {
  return (<Box>
    {data.content ? <Typography sx={{ fontFamily: "cabin" }}>{data.content}</Typography> : <></>}
    {data.subsections.length > 0 ?
      <Box>
        {data.subsections.map((section, index) => (
          <Box key={index} sx={{ marginBottom: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: "cabin", fontWeight: "bold" }}>{section.menutitle}</Typography>
            {section.content && <Typography sx={{ fontFamily: "cabin" }}>{section.content}</Typography>}
            {section.subsections.length > 0 && (section.type === "tabs" ? <TabbedInfoSection data={section} /> : <ListInfoSection data={section} />)}
          </Box>
        ))}
      </Box> : <></>}</Box>)
}

function TabbedInfoSection({ data }: { data: InfoSection }) {
  const [value, setValue] = useState("0");
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };
  return <Box>
    {data.content ? <Typography sx={{ fontFamily: "cabin" }}>{data.content}</Typography> : <></>}
    {data.subsections.length > 0 ?
      <TabContext value={value}>
        <TabList onChange={handleChange} aria-label="tabs">
          {data.subsections.map((section, index) => <Tab key={index} label={section.menutitle} value={index.toString()} />)}
        </TabList>
        {data.subsections.map((section, index) => <TabPanel key={index} value={index.toString()}>{section.type === "tabs" ? <TabbedInfoSection data={section} /> : <ListInfoSection data={section} />}</TabPanel>)}
      </TabContext> : <></>}
  </Box>
}

export default function WNestedInfoComponent() {
  return <TabbedInfoSection data={NestedInfoData} />


}
from django.core.management.base import BaseCommand
from app.user.models import Lesson, Section, Slide, Task, TestQuestion, Quest


class Command(BaseCommand):
    help = 'Seed initial data'

    def handle(self, *args, **kwargs):
        self.seed_lessons()
        self.seed_quests()
        self.stdout.write(self.style.SUCCESS('Data seeded successfully'))

    def seed_lessons(self):
        if Lesson.objects.exists():
            self.stdout.write('Lessons already seeded — skipping')
            return

        # ── The Basics ──
        basics = Lesson.objects.create(
            title='The Basics', order=1,
            age_group='child', level_required=1,
            description='Learn Python fundamentals'
        )

        intro = Section.objects.create(
            lesson=basics, title='Introduction', order=1, node_type='introduction')
        app = Section.objects.create(
            lesson=basics, title='Application',  order=2, node_type='application')
        Section.objects.create(
            lesson=basics, title='Competition', order=3, node_type='competition')
        test = Section.objects.create(
            lesson=basics, title='Test', order=4, node_type='test', is_boss=True)

        # Slides
        Slide.objects.create(section=intro, order=1,
                             title='What is Python?',
                             explanation='Python is a beginner-friendly programming language used in web development, data science, and AI. It reads almost like plain English!',
                             code='print("Hello, World!")')

        Slide.objects.create(section=intro, order=2,
                             title='Variables',
                             explanation='Variables are containers that store data values. In Python you do not need to declare the type — just assign a value.',
                             code='name = "EVA"\nage = 10\nprint(name)\nprint(age)')

        Slide.objects.create(section=intro, order=3,
                             title='Data Types',
                             explanation='Python has several data types. The most common are strings (text), integers (whole numbers), floats (decimals), and booleans (True/False).',
                             code='name   = "EVA"    # string\nage    = 10       # integer\nscore  = 9.5      # float\nactive = True     # boolean\nprint(name, age, score, active)')

        Slide.objects.create(section=intro, order=4,
                             title='The print() Function',
                             explanation='The print() function displays output to the screen. You can print text, numbers, and variables.',
                             code='print("Hello!")\nprint("My name is", "EVA")\nprint(10 + 5)\nname = "EVA"\nprint("Welcome,", name)')

        Slide.objects.create(section=intro, order=5,
                             title='Comments',
                             explanation='Comments are notes in your code that Python ignores when running. Use # to write a comment. They help explain what your code does.',
                             code='# This is a comment\nname = "EVA"  # This stores a name\n# Print the name\nprint(name)')

        # Tasks
        Task.objects.create(section=app, order=1,
                            instruction='Create a variable called name and assign your name to it. Then print it.',
                            hint='Use the = operator to assign a value, then use print()',
                            starter_code='# Create your variable here\n\n',
                            expected_output='',
                            check_regex=r'name\s*=\s*["\'].*["\']')

        Task.objects.create(section=app, order=2,
                            instruction='Print the message "Hello, Python!" to the screen.',
                            hint='Use the print() function with the exact text',
                            starter_code='# Print your message\n\n',
                            expected_output='Hello, Python!',
                            check_regex=r'print\s*\(\s*["\']Hello, Python!["\']')

        Task.objects.create(section=app, order=3,
                            instruction='Create two variables: age (an integer) and height (a float). Print both on separate lines.',
                            hint='Integers have no decimal point. Floats have a decimal like 1.75',
                            starter_code='# Create your variables\n\n',
                            expected_output='',
                            check_regex=r'age\s*=\s*\d+')

        Task.objects.create(section=app, order=4,
                            instruction='Write a comment explaining what your code does, then create a variable called score with value 100 and print it.',
                            hint='Use # to write a comment on its own line',
                            starter_code='# Write your comment here\n\n',
                            expected_output='100',
                            check_regex=r'score\s*=\s*100')

        # Test Questions
        TestQuestion.objects.create(section=test, order=1,
                                    instruction='Write a Python program that prints your name and age on separate lines.',
                                    starter_code='# Write your solution\n\n',
                                    expected_output='',
                                    check_regex=r'print\s*\(',
                                    points=25)

        TestQuestion.objects.create(section=test, order=2,
                                    instruction='Create 3 variables: a string called language, an integer called year, and a float called version. Print all three.',
                                    starter_code='# Create your variables\n\n',
                                    expected_output='',
                                    check_regex=r'language\s*=',
                                    points=25)

        TestQuestion.objects.create(section=test, order=3,
                                    instruction='Write a program that prints "Python is awesome!" exactly.',
                                    starter_code='# Write your solution\n\n',
                                    expected_output='Python is awesome!',
                                    check_regex=r'print\s*\(\s*["\']Python is awesome!["\']',
                                    points=25)

        TestQuestion.objects.create(section=test, order=4,
                                    instruction='Create a variable called score with value 100 and a variable called name with your name. Print both on the same line using print().',
                                    starter_code='# Write your solution\n\n',
                                    expected_output='',
                                    check_regex=r'score\s*=\s*100',
                                    points=25)

        # ── Control Flow ──
        cf = Lesson.objects.create(
            title='Control Flow', order=2,
            age_group='child', level_required=1,
            description='Learn if/else statements and comparisons'
        )

        cf_intro = Section.objects.create(
            lesson=cf, title='Introduction', order=1, node_type='introduction')
        cf_app = Section.objects.create(
            lesson=cf, title='Application',  order=2, node_type='application')
        Section.objects.create(
            lesson=cf, title='Competition', order=3, node_type='competition')
        cf_test = Section.objects.create(
            lesson=cf, title='Test', order=4, node_type='test', is_boss=True)

        # Slides
        Slide.objects.create(section=cf_intro, order=1,
                             title='What is Control Flow?',
                             explanation='Control flow is the order in which Python executes your code. By default it runs top to bottom, but with conditions we can change that.',
                             code='print("Line 1")\nprint("Line 2")\nprint("Line 3")')

        Slide.objects.create(section=cf_intro, order=2,
                             title='The if Statement',
                             explanation='The if statement lets you run code only when a condition is True. If the condition is False, the code inside is skipped.',
                             code='age = 12\nif age >= 10:\n    print("You are old enough!")')

        Slide.objects.create(section=cf_intro, order=3,
                             title='if / else',
                             explanation='The else block runs when the if condition is False. This gives you two possible paths — one for True, one for False.',
                             code='age = 8\nif age >= 10:\n    print("Old enough")\nelse:\n    print("Too young")')

        Slide.objects.create(section=cf_intro, order=4,
                             title='Comparison Operators',
                             explanation='Conditions use comparison operators to compare values. These return True or False.',
                             code='x = 10\nprint(x > 5)   # True\nprint(x == 10) # True\nprint(x < 3)   # False\nprint(x != 10) # False')

        Slide.objects.create(section=cf_intro, order=5,
                             title='elif — Multiple Conditions',
                             explanation='You can chain conditions using elif to handle multiple cases. Python checks each condition in order and runs the first one that is True.',
                             code='score = 75\nif score >= 90:\n    print("A")\nelif score >= 75:\n    print("B")\nelif score >= 60:\n    print("C")\nelse:\n    print("F")')

        # Tasks
        Task.objects.create(section=cf_app, order=1,
                            instruction='Write an if statement that checks if a number is greater than 10 and prints "Big number!" if true.',
                            hint='Use the > operator inside your if statement',
                            starter_code='number = 15\n# Write your if statement\n\n',
                            expected_output='Big number!',
                            check_regex=r'if\s+.+:')

        Task.objects.create(section=cf_app, order=2,
                            instruction='Write an if/else that prints "positive" if a number is greater than 0, otherwise prints "negative".',
                            hint='Use if/else with a comparison operator',
                            starter_code='number = 5\n# Write your if/else\n\n',
                            expected_output='positive',
                            check_regex=r'else\s*:')

        Task.objects.create(section=cf_app, order=3,
                            instruction='Use if/elif/else to grade a score: 90+ prints "A", 75+ prints "B", 60+ prints "C", otherwise prints "F".',
                            hint='Chain conditions with elif — Python checks them in order',
                            starter_code='score = 85\n# Write your grading system\n\n',
                            expected_output='B',
                            check_regex=r'elif\s+.+:')

        Task.objects.create(section=cf_app, order=4,
                            instruction='Write a program that checks if a number is even or odd. Print "even" or "odd".',
                            hint='Use the % operator — if number % 2 == 0 it is even',
                            starter_code='number = 7\n# Check even or odd\n\n',
                            expected_output='odd',
                            check_regex=r'%\s*2')

        # Test Questions
        TestQuestion.objects.create(section=cf_test, order=1,
                                    instruction='Write a program that checks if a variable called age is 18 or older. Print "adult" if true, "minor" if false.',
                                    starter_code='age = 20\n# Write your solution\n\n',
                                    expected_output='adult',
                                    check_regex=r'if\s+age\s*>=\s*18',
                                    points=25)

        TestQuestion.objects.create(section=cf_test, order=2,
                                    instruction='Write a program that prints the grade for a score of 82: 90+ is A, 80+ is B, 70+ is C, else F.',
                                    starter_code='score = 82\n# Write your solution\n\n',
                                    expected_output='B',
                                    check_regex=r'elif\s+.+:',
                                    points=25)

        TestQuestion.objects.create(section=cf_test, order=3,
                                    instruction='Check if the number 15 is divisible by both 3 and 5. Print "FizzBuzz" if true.',
                                    starter_code='number = 15\n# Write your solution\n\n',
                                    expected_output='FizzBuzz',
                                    check_regex=r'%\s*3.*%\s*5|%\s*5.*%\s*3|%\s*15',
                                    points=25)

        TestQuestion.objects.create(section=cf_test, order=4,
                                    instruction='Write a program with a variable called temperature. If it is above 30 print "hot", if below 10 print "cold", otherwise print "comfortable".',
                                    starter_code='temperature = 25\n# Write your solution\n\n',
                                    expected_output='comfortable',
                                    check_regex=r'if.*30|elif.*10',
                                    points=25)

        # ── Functions ──
        fn = Lesson.objects.create(
            title='Functions', order=3,
            age_group='child', level_required=2,
            description='Learn to write reusable functions'
        )

        fn_intro = Section.objects.create(
            lesson=fn, title='Introduction', order=1, node_type='introduction')
        fn_app = Section.objects.create(
            lesson=fn, title='Application',  order=2, node_type='application')
        Section.objects.create(
            lesson=fn, title='Competition', order=3, node_type='competition')
        fn_test = Section.objects.create(
            lesson=fn, title='Test', order=4, node_type='test', is_boss=True)

        # Slides
        Slide.objects.create(section=fn_intro, order=1,
                             title='What is a Function?',
                             explanation='A function is a reusable block of code that performs a specific task. Instead of writing the same code multiple times, you write it once in a function and call it whenever you need it.',
                             code='def greet():\n    print("Hello!")\n\ngreet()\ngreet()\ngreet()')

        Slide.objects.create(section=fn_intro, order=2,
                             title='Defining a Function',
                             explanation='Use the def keyword to define a function. The function name is followed by parentheses and a colon. The code inside must be indented.',
                             code='def say_hello():\n    print("Hello, EVA!")\n\n# Call the function\nsay_hello()')

        Slide.objects.create(section=fn_intro, order=3,
                             title='Function Parameters',
                             explanation='Parameters allow you to pass information into a function. They act like variables inside the function.',
                             code='def greet(name):\n    print("Hello,", name)\n\ngreet("EVA")\ngreet("Python")\ngreet("World")')

        Slide.objects.create(section=fn_intro, order=4,
                             title='Return Values',
                             explanation='Functions can return a value using the return keyword. The returned value can be stored in a variable or used directly.',
                             code='def add(a, b):\n    return a + b\n\nresult = add(5, 3)\nprint(result)  # 8\nprint(add(10, 20))  # 30')

        Slide.objects.create(section=fn_intro, order=5,
                             title='Why Use Functions?',
                             explanation='Functions make your code cleaner, reusable, and easier to understand. Instead of repeating code, you write it once and call it many times.',
                             code='def calculate_area(width, height):\n    return width * height\n\nroom1 = calculate_area(5, 4)\nroom2 = calculate_area(3, 6)\nprint("Room 1:", room1)\nprint("Room 2:", room2)')

        # Tasks
        Task.objects.create(section=fn_app, order=1,
                            instruction='Define a function called greet() that prints "Hello, EVA!". Then call the function.',
                            hint='Use def to define the function, then call it by its name with ()',
                            starter_code='# Define your function here\n\n\n# Call your function\n',
                            expected_output='Hello, EVA!',
                            check_regex=r'def\s+greet\s*\(\s*\)')

        Task.objects.create(section=fn_app, order=2,
                            instruction='Define a function called greet(name) that takes a name parameter and prints "Hello, " followed by the name. Call it with your name.',
                            hint='Add a parameter inside the parentheses of your function definition',
                            starter_code='# Define your function\n\n\n# Call your function\n',
                            expected_output='',
                            check_regex=r'def\s+greet\s*\(\s*\w+\s*\)')

        Task.objects.create(section=fn_app, order=3,
                            instruction='Define a function called add(a, b) that returns the sum of two numbers. Print the result of add(5, 3).',
                            hint='Use the return keyword to send back the result',
                            starter_code='# Define your function\n\n\n# Print the result\n',
                            expected_output='8',
                            check_regex=r'return\s+a\s*\+\s*b')

        Task.objects.create(section=fn_app, order=4,
                            instruction='Define a function called is_even(number) that returns True if the number is even, False if odd. Test it with the number 4.',
                            hint='Use the % operator — if number % 2 == 0 it is even',
                            starter_code='# Define your function\n\n\n# Test your function\n',
                            expected_output='True',
                            check_regex=r'def\s+is_even\s*\(')

        # Test Questions
        TestQuestion.objects.create(section=fn_test, order=1,
                                    instruction='Define a function called square(n) that returns the square of a number. Print the result of square(5).',
                                    starter_code='# Write your solution\n\n',
                                    expected_output='25',
                                    check_regex=r'def\s+square\s*\(',
                                    points=25)

        TestQuestion.objects.create(section=fn_test, order=2,
                                    instruction='Define a function called full_name(first, last) that returns the full name as a single string. Print full_name("EVA", "Academy").',
                                    starter_code='# Write your solution\n\n',
                                    expected_output='EVA Academy',
                                    check_regex=r'def\s+full_name\s*\(',
                                    points=25)

        TestQuestion.objects.create(section=fn_test, order=3,
                                    instruction='Define a function called max_number(a, b) that returns the larger of two numbers. Print max_number(10, 20).',
                                    starter_code='# Write your solution\n\n',
                                    expected_output='20',
                                    check_regex=r'def\s+max_number\s*\(',
                                    points=25)

        TestQuestion.objects.create(section=fn_test, order=4,
                                    instruction='Define a function called greet_user(name, age) that prints "Hello [name], you are [age] years old!". Call it with your own values.',
                                    starter_code='# Write your solution\n\n',
                                    expected_output='',
                                    check_regex=r'def\s+greet_user\s*\(',
                                    points=25)

        self.stdout.write('Lessons seeded')

    def seed_quests(self):
        if Quest.objects.exists():
            self.stdout.write('Quests already seeded — skipping')
            return

        Quest.objects.create(title='Knowledge Seeker', description='Complete 3 Introduction nodes', icon='fas fa-book-open',
                             color='#3b82f6', xp_reward=30, age_group='child', node_type='introduction', target_count=3)
        Quest.objects.create(title='Practice Makes Perfect', description='Complete 3 Application nodes', icon='fas fa-code',
                             color='#10b981', xp_reward=50, age_group='child', node_type='application', target_count=3)
        Quest.objects.create(title='Battle Ready', description='Complete 1 Competition node', icon='fas fa-swords',
                             color='#f97316', xp_reward=60, age_group='child', node_type='competition', target_count=1)
        Quest.objects.create(title='Test Taker', description='Complete 2 Test nodes', icon='fas fa-dragon',
                             color='#ef4444', xp_reward=80, age_group='child', node_type='test', target_count=2)
        Quest.objects.create(title='Lesson Master', description='Complete a full lesson', icon='fas fa-trophy',
                             color='#7c3aed', xp_reward=100, age_group='child', node_type='', target_count=4)

        self.stdout.write('Quests seeded')
